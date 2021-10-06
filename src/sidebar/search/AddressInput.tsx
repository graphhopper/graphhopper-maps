import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Coordinate, QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { GeocodingHit } from '@/api/graphhopper'
import { ErrorAction } from '@/actions/Actions'
import Autocomplete, {
    AutocompleteItem,
    GeocodingItem,
    isGeocodingItem,
    SelectCurrentLocationItem,
} from '@/sidebar/search/AddressInputAutocomplete'
import Dispatcher from '@/stores/Dispatcher'

import styles from './AddressInput.module.css'
import Api, { getApi } from '@/api/Api'
import { tr } from '@/translation/Translation'
import { convertToQueryText } from '@/Converters'

export interface AddressInputProps {
    point: QueryPoint
    autofocus: boolean
    onCancel: () => void
    onAddressSelected: (queryText: string, coord: Coordinate | undefined) => void
    onChange: (value: string) => void
}

export default function AddressInput(props: AddressInputProps) {
    // controlled component pattern with initial value set from props
    const [text, setText] = useState(props.point.queryText)
    useEffect(() => setText(props.point.queryText), [props.point.queryText])

    // container for geocoding results which get set by the geocoder class and set to empty if the underlying query point gets changed from outside
    // also gets filled with an item to select the current location as input if input has focus and geocoding results are
    // empty
    const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([])
    const [geocoder] = useState(
        new Geocoder(getApi(), hits => {
            const items = hits.map(hit => {
                return { type: 'geocoding', hit: hit } as GeocodingItem
            })
            setAutocompleteItems(items)
        })
    )
    useEffect(() => setAutocompleteItems([]), [props.point])
    useEffect(() => {
        if (hasFocus && text.length == 0 && autocompleteItems.length === 0) {
            const locationItem: SelectCurrentLocationItem = {
                type: 'currentLocation',
            }
            setAutocompleteItems([locationItem])
        }
    }, [autocompleteItems])

    // highlighted result of geocoding results. Keep track which index is highlighted and change things on ArrowUp and Down
    // on Enter select highlighted result or the 0th if nothing is highlighted
    const [highlightedResult, setHighlightedResult] = useState<number>(-1)
    useEffect(() => setHighlightedResult(-1), [autocompleteItems])
    const searchInput = useRef<HTMLInputElement>(null)
    const onKeypress = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Escape') {
                searchInput.current!.blur()
                return
            }
            if (autocompleteItems.length === 0) return

            switch (event.key) {
                case 'ArrowUp':
                    setHighlightedResult(i => calculateHighlightedIndex(autocompleteItems.length, i, -1))
                    break
                case 'ArrowDown':
                    setHighlightedResult(i => calculateHighlightedIndex(autocompleteItems.length, i, 1))
                    break
                case 'Enter':
                case 'Tab':
                    // by default use the first result, otherwise the highlighted one
                    const index = highlightedResult >= 0 ? highlightedResult : 0

                    // it seems like the order of the blur and onAddressSelected statement is important...
                    searchInput.current!.blur()
                    onAutocompleteSelected(autocompleteItems[index], props.onAddressSelected)
                    break
            }
        },
        [autocompleteItems, highlightedResult]
    )

    // keep track of focus and toggle fullscreen display on small screens
    const [hasFocus, setHasFocus] = useState(false)
    const containerClass = hasFocus ? styles.container + ' ' + styles.fullscreen : styles.container
    const type = props.point.type

    return (
        <div className={containerClass}>
            <div className={styles.inputContainer}>
                <input
                    className={styles.input}
                    type="text"
                    ref={searchInput}
                    onChange={e => {
                        setText(e.target.value)
                        geocoder.request(e.target.value)
                        props.onChange(e.target.value)
                    }}
                    onKeyDown={onKeypress}
                    onFocus={event => {
                        setHasFocus(true)
                        event.target.select()
                    }}
                    onBlur={() => {
                        geocoder.cancel()
                        setHasFocus(false)
                        setAutocompleteItems([])
                    }}
                    value={text}
                    autoFocus={props.autofocus}
                    placeholder={tr(
                        type == QueryPointType.From ? 'from_hint' : type == QueryPointType.To ? 'to_hint' : 'via_hint'
                    )}
                />
                <button className={styles.btnClose} onClick={() => setHasFocus(false)}>
                    Close
                </button>
            </div>

            {autocompleteItems.length > 0 && (
                <div className={styles.popup}>
                    <Autocomplete
                        items={autocompleteItems}
                        highlightedItem={autocompleteItems[highlightedResult]}
                        onSelect={item => {
                            // it seems like the order of the blur and onAddressSelected statement is important...
                            searchInput.current!.blur()
                            onAutocompleteSelected(item, props.onAddressSelected)
                        }}
                    />
                </div>
            )}
        </div>
    )
}

function onAutocompleteSelected(
    item: AutocompleteItem,
    onSelect: (queryText: string, coordinate: Coordinate | undefined) => void
) {
    if (isGeocodingItem(item)) {
        onSelect(convertToQueryText(item.hit), item.hit.point)
    } else {
        if (!navigator.geolocation) {
            Dispatcher.dispatch(new ErrorAction('Geolocation is not supported in this browser'))
            return
        }

        onSelect(tr('searching_location') + ' ...', undefined)
        navigator.geolocation.getCurrentPosition(
            position => {
                onSelect(tr('current_location'), { lat: position.coords.latitude, lng: position.coords.longitude })
            },
            error => {
                Dispatcher.dispatch(new ErrorAction(tr('searching_location_failed') + ': ' + error.message))
                onSelect('', undefined)
            },
            // DO NOT use e.g. maximumAge: 5_000 -> getCurrentPosition will then never return on mobile firefox!?
            { timeout: 300_000 }
        )
    }
}

function calculateHighlightedIndex(length: number, currentIndex: number, incrementBy: number) {
    const nextIndex = currentIndex + incrementBy
    if (nextIndex >= length) return 0
    if (nextIndex < 0) return length - 1
    return nextIndex
}

/**
 * This could definitely be achieved with an effect. But after trying for a while I saved some money and wrote it the
 * Way I know. If we hire an 10+ react developer, this should be changed.
 */
class Geocoder {
    private requestId = 0
    private readonly timeout = new Timout(200)
    private readonly api: Api
    private readonly onSuccess: (hits: GeocodingHit[]) => void

    constructor(api: Api, onSuccess: (hits: GeocodingHit[]) => void) {
        this.api = api
        this.onSuccess = onSuccess
    }

    request(query: string) {
        this.requestAsync(query).then(() => {})
    }

    cancel() {
        // invalidates last request if there is one
        this.getNextId()
    }

    async requestAsync(query: string) {
        const currentId = this.getNextId()
        this.timeout.cancel()
        if (!query || query.length < 2) return

        await this.timeout.wait()
        try {
            const result = await this.api.geocode(query)
            const hits = Geocoder.filterDuplicates(result.hits)
            if (currentId === this.requestId) this.onSuccess(hits)
        } catch (reason) {
            throw Error('Could not get geocoding results because: ' + reason)
        }
    }

    private getNextId() {
        this.requestId++
        return this.requestId
    }

    private static filterDuplicates(hits: GeocodingHit[]) {
        const set: Set<string> = new Set()
        return hits.filter(hit => {
            if (!set.has(hit.osm_id)) {
                set.add(hit.osm_id)
                return true
            }
            return false
        })
    }
}

class Timout {
    private readonly delay: number
    private handle: number = 0

    constructor(delay: number) {
        this.delay = delay
    }

    wait() {
        return new Promise(resolve => {
            this.handle = window.setTimeout(resolve, this.delay)
        })
    }
    cancel() {
        clearTimeout(this.handle)
    }
}
