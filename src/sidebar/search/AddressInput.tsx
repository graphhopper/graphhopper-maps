import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Coordinate, getBBoxFromCoord, QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { Bbox, GeocodingHit } from '@/api/graphhopper'
import { ErrorAction } from '@/actions/Actions'
import Autocomplete, {
    AutocompleteItem,
    GeocodingItem,
    MoreResultsItem,
    SelectCurrentLocationItem,
} from '@/sidebar/search/AddressInputAutocomplete'
import Dispatcher from '@/stores/Dispatcher'

import styles from './AddressInput.module.css'
import Api, { getApi } from '@/api/Api'
import { tr } from '@/translation/Translation'
import { hitToItem, nominatimHitToItem, textToCoordinate } from '@/Converters'
import { useMediaQuery } from 'react-responsive'
import PopUp from '@/sidebar/search/PopUp'
import PlainButton from '@/PlainButton'
import { onCurrentLocationSelected } from '@/map/MapComponent'

export interface AddressInputProps {
    point: QueryPoint
    onCancel: () => void
    onAddressSelected: (queryText: string, coord: Coordinate | undefined, bbox: Bbox | undefined) => void
    onChange: (value: string) => void
    clearSelectedInput: () => void
    moveStartIndex: number
    dropPreviewIndex: number
    index: number
}

export default function AddressInput(props: AddressInputProps) {
    // controlled component pattern with initial value set from props
    const [text, setText] = useState(props.point.queryText)
    useEffect(() => setText(props.point.queryText), [props.point.queryText])

    // keep track of focus and toggle fullscreen display on small screens
    const [hasFocus, setHasFocus] = useState(false)

    // container for geocoding results which gets set by the geocoder class and set to empty if the underlying query point gets changed from outside
    // also gets filled with an item to select the current location as input if input has focus and geocoding results are
    // empty
    const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([])
    const [geocoder] = useState(
        new Geocoder(getApi(), (query, provider, hits) => {
            const items: AutocompleteItem[] = hits.map(hit => {
                const obj = provider === 'nominatim' ? nominatimHitToItem(hit) : hitToItem(hit)
                return new GeocodingItem(
                    obj.mainText,
                    obj.secondText,
                    hit.point,
                    hit.extent ? hit.extent : getBBoxFromCoord(hit.point)
                )
            })

            if (provider !== 'nominatim' && getApi().supportsGeocoding()) {
                items.push(new MoreResultsItem(query))
                setAutocompleteItems(items)
            } else {
                // TODO autocompleteItems is empty here because query point changed from outside somehow
                // const res = autocompleteItems.length > 1 ? autocompleteItems.slice(0, autocompleteItems.length - 2) : autocompleteItems
                // res.concat(items)
                setAutocompleteItems(items)
            }
        })
    )
    // if item is selected we need to clear the autocompletion list
    useEffect(() => setAutocompleteItems([]), [props.point])
    // if no items but input is selected show current location item
    useEffect(() => {
        if (hasFocus && text.length == 0 && autocompleteItems.length === 0)
            setAutocompleteItems([new SelectCurrentLocationItem()])
    }, [autocompleteItems, hasFocus])

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

            switch (event.key) {
                case 'ArrowUp':
                    setHighlightedResult(i => calculateHighlightedIndex(autocompleteItems.length, i, -1))
                    break
                case 'ArrowDown':
                    setHighlightedResult(i => calculateHighlightedIndex(autocompleteItems.length, i, 1))
                    break
                case 'Enter':
                case 'Tab':
                    // try to parse input as coordinate. Otherwise use autocomplete results
                    const coordinate = textToCoordinate(text)
                    if (coordinate) {
                        props.onAddressSelected(text, coordinate, getBBoxFromCoord(coordinate))
                    } else if (autocompleteItems.length > 0) {
                        // by default use the first result, otherwise the highlighted one
                        const index = highlightedResult >= 0 ? highlightedResult : 0
                        const item = autocompleteItems[index]
                        if (item instanceof GeocodingItem) props.onAddressSelected(item.toText(), item.point, item.bbox)
                    }
                    searchInput.current!.blur()
                    break
            }
        },
        [autocompleteItems, highlightedResult]
    )

    const containerClass = hasFocus ? styles.container + ' ' + styles.fullscreen : styles.container

    const type = props.point.type

    return (
        <div className={containerClass}>
            <div
                className={[
                    styles.inputContainer,
                    // show line (border) where input would be moved if dropped
                    props.dropPreviewIndex == props.index
                        ? props.dropPreviewIndex < props.moveStartIndex
                            ? styles.topBorder
                            : styles.bottomBorder
                        : {},
                ].join(' ')}
            >
                <input
                    style={props.moveStartIndex == props.index ? { borderWidth: '2px', margin: '-1px' } : {}}
                    className={styles.input}
                    type="text"
                    ref={searchInput}
                    onChange={e => {
                        setText(e.target.value)
                        const coordinate = textToCoordinate(e.target.value)
                        if (!coordinate) geocoder.request(e.target.value, 'default')
                        props.onChange(e.target.value)
                    }}
                    onKeyDown={onKeypress}
                    onFocus={event => {
                        props.clearSelectedInput()
                        setHasFocus(true)
                        event.target.select()
                    }}
                    onBlur={() => {
                        geocoder.cancel()
                        setHasFocus(false)
                        setAutocompleteItems([])
                    }}
                    value={text}
                    placeholder={tr(
                        type == QueryPointType.From ? 'from_hint' : type == QueryPointType.To ? 'to_hint' : 'via_hint'
                    )}
                />
                <PlainButton className={styles.btnClose} onClick={() => setHasFocus(false)}>
                    {tr('back_to_map')}
                </PlainButton>
            </div>

            {autocompleteItems.length > 0 && (
                <ResponsiveAutocomplete inputRef={searchInput.current!}>
                    <Autocomplete
                        items={autocompleteItems}
                        highlightedItem={autocompleteItems[highlightedResult]}
                        onSelect={item => {
                            if (item instanceof GeocodingItem) {
                                searchInput.current!.blur()
                                props.onAddressSelected(item.toText(), item.point, item.bbox)
                            } else if (item instanceof SelectCurrentLocationItem) {
                                searchInput.current!.blur()
                                onCurrentLocationSelected(props.onAddressSelected)
                            } else if (item instanceof MoreResultsItem) {
                                // do not blur
                                const coordinate = textToCoordinate(item.search)
                                if (!coordinate) geocoder.request(item.search, 'nominatim')
                            }
                        }}
                    />
                </ResponsiveAutocomplete>
            )}
        </div>
    )
}

function ResponsiveAutocomplete({ inputRef, children }: { inputRef: HTMLElement; children: ReactNode }): JSX.Element {
    const isSmallScreen = useMediaQuery({ query: '(max-width: 44rem)' })
    return (
        <>
            {isSmallScreen ? (
                children
            ) : (
                <PopUp inputElement={inputRef} keepClearAtBottom={270}>
                    {children}
                </PopUp>
            )}
        </>
    )
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
    private readonly onSuccess: (query: string, provider: string, hits: GeocodingHit[]) => void

    constructor(api: Api, onSuccess: (query: string, provider: string, hits: GeocodingHit[]) => void) {
        this.api = api
        this.onSuccess = onSuccess
    }

    request(query: string, provider: string) {
        this.requestAsync(query, provider).then(() => {})
    }

    cancel() {
        // invalidates last request if there is one
        this.getNextId()
    }

    async requestAsync(query: string, provider: string) {
        const currentId = this.getNextId()
        this.timeout.cancel()
        if (!query || query.length < 2) return

        await this.timeout.wait()
        try {
            const result = await this.api.geocode(query, provider)
            const hits = Geocoder.filterDuplicates(result.hits)
            if (currentId === this.requestId) this.onSuccess(query, provider, hits)
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
