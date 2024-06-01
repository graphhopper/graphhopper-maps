import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Coordinate, getBBoxFromCoord, QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { Bbox, GeocodingHit } from '@/api/graphhopper'
import Autocomplete, {
    AutocompleteItem,
    GeocodingItem,
    MoreResultsItem,
    POIQueryItem,
    SelectCurrentLocationItem,
} from '@/sidebar/search/AddressInputAutocomplete'

import ArrowBack from './arrow_back.svg'
import Cross from '@/sidebar/times-solid-thin.svg'
import styles from './AddressInput.module.css'
import Api, { AddressParseResult, ApiImpl, getApi } from '@/api/Api'
import { tr } from '@/translation/Translation'
import { coordinateToText, hitToItem, nominatimHitToItem, textToCoordinate } from '@/Converters'
import { useMediaQuery } from 'react-responsive'
import PopUp from '@/sidebar/search/PopUp'
import PlainButton from '@/PlainButton'
import { onCurrentLocationSelected } from '@/map/MapComponent'
import Dispatcher from '@/stores/Dispatcher'
import { SetBBox, SetPOI } from '@/actions/Actions'

export interface AddressInputProps {
    point: QueryPoint
    points: QueryPoint[]
    onCancel: () => void
    onAddressSelected: (queryText: string, coord: Coordinate | undefined, bbox: Bbox | undefined) => void
    onChange: (value: string) => void
    clearDragDrop: () => void
    moveStartIndex: number
    dropPreviewIndex: number
    index: number
    mapCenter: Coordinate
    mapRadius: number
}

export default function AddressInput(props: AddressInputProps) {
    // controlled component pattern with initial value set from props
    const [text, setText] = useState(props.point.queryText)
    useEffect(() => setText(props.point.queryText), [props.point.queryText])

    // keep track of focus and toggle fullscreen display on small screens
    const [hasFocus, setHasFocus] = useState(false)
    const isSmallScreen = useMediaQuery({ query: '(max-width: 44rem)' })

    // container for geocoding results which gets set by the geocoder class and set to empty if the underlying query point gets changed from outside
    // also gets filled with an item to select the current location as input if input has focus and geocoding results are
    // empty
    const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([])
    const [geocoder] = useState(
        new Geocoder(getApi(), (query, provider, hits) => {
            const items: AutocompleteItem[] = []
            const parseResult = AddressParseResult.parse(query, true)
            if (parseResult.hasPOIs()) items.push(new POIQueryItem(parseResult))

            hits.forEach(hit => {
                const obj = provider === 'nominatim' ? nominatimHitToItem(hit) : hitToItem(hit)
                items.push(
                    new GeocodingItem(
                        obj.mainText,
                        obj.secondText,
                        hit.point,
                        hit.extent ? hit.extent : getBBoxFromCoord(hit.point)
                    )
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

    const [poiSearch] = useState(
        new ReverseGeocoder(getApi(), (hits, parseResult) => {
            const pois = hits.map(hit => {
                const res = hitToItem(hit)
                return {
                    name: res.mainText,
                    icon: parseResult.icon,
                    coordinate: hit.point,
                    selected: false,
                }
            })

            const bbox = ApiImpl.getBBoxPoints(pois.map(p => p.coordinate))
            if (bbox) {
                Dispatcher.dispatch(new SetBBox(bbox))
                Dispatcher.dispatch(new SetPOI(pois))
            } else {
                console.warn('invalid bbox for points ' + JSON.stringify(pois) + " result was: " + JSON.stringify(parseResult))
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

    function hideSuggestions() {
        geocoder.cancel()
        setAutocompleteItems([])
    }

    // highlighted result of geocoding results. Keep track which index is highlighted and change things on ArrowUp and Down
    // on Enter select highlighted result or the 0th if nothing is highlighted
    const [highlightedResult, setHighlightedResult] = useState<number>(-1)
    useEffect(() => setHighlightedResult(-1), [autocompleteItems])

    // for positioning of the autocomplete we need:
    const searchInputContainer = useRef<HTMLInputElement>(null)

    // to focus the input after clear button we need:
    const searchInput = useRef<HTMLInputElement>(null)

    const onKeypress = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            const inputElement = event.target as HTMLInputElement
            if (event.key === 'Escape') {
                inputElement.blur()
                // onBlur is deactivated for mobile so force:
                setHasFocus(false)
                hideSuggestions()
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
                    inputElement.blur()
                    // onBlur is deactivated for mobile so force:
                    setHasFocus(false)
                    hideSuggestions()
                    break
            }
        },
        [autocompleteItems, highlightedResult]
    )

    // the "fullscreen" css is only defined for smallscreen
    const containerClass = hasFocus ? styles.fullscreen : ''
    const type = props.point.type

    // get the bias point for the geocoder
    // (the query point above the current one)
    const autocompleteIndex = props.points.findIndex(point => !point.isInitialized)
    const biasCoord = props.points[autocompleteIndex - 1]?.coordinate

    return (
        <div className={containerClass}>
            <div
                ref={searchInputContainer}
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
                <PlainButton
                    className={styles.btnClose}
                    onClick={() => {
                        setHasFocus(false)
                        hideSuggestions()
                    }}
                >
                    <ArrowBack />
                </PlainButton>
                <input
                    style={props.moveStartIndex == props.index ? { borderWidth: '2px', margin: '-1px' } : {}}
                    className={styles.input}
                    type="text"
                    ref={searchInput}
                    autoComplete="off"
                    onChange={e => {
                        const query = e.target.value
                        setText(query)
                        const coordinate = textToCoordinate(query)
                        if (!coordinate) geocoder.request(query, biasCoord, 'default')
                        props.onChange(query)
                    }}
                    onKeyDown={onKeypress}
                    onFocus={() => {
                        setHasFocus(true)
                        props.clearDragDrop()
                    }}
                    onBlur={() => {}}
                    value={text}
                    placeholder={tr(
                        type == QueryPointType.From ? 'from_hint' : type == QueryPointType.To ? 'to_hint' : 'via_hint'
                    )}
                />

                <PlainButton
                    style={text.length == 0 ? { display: 'none' } : {}}
                    className={styles.btnInputClear}
                    onClick={() => {
                        setText('')
                        props.onChange('')
                        searchInput.current!.focus()
                    }}
                >
                    <Cross />
                </PlainButton>

                {autocompleteItems.length > 0 && (
                    <ResponsiveAutocomplete
                        inputRef={searchInputContainer.current!}
                        index={props.index}
                        isSmallScreen={isSmallScreen}
                    >
                        <Autocomplete
                            items={autocompleteItems}
                            highlightedItem={autocompleteItems[highlightedResult]}
                            onSelect={item => {
                                setHasFocus(false)
                                if (item instanceof GeocodingItem) {
                                    hideSuggestions()
                                    props.onAddressSelected(item.toText(), item.point, item.bbox)
                                } else if (item instanceof SelectCurrentLocationItem) {
                                    hideSuggestions()
                                    onCurrentLocationSelected(props.onAddressSelected)
                                } else if (item instanceof MoreResultsItem) {
                                    // do not hide autocomplete items
                                    const coordinate = textToCoordinate(item.search)
                                    if (!coordinate) geocoder.request(item.search, biasCoord, 'nominatim')
                                } else if (item instanceof POIQueryItem) {
                                    hideSuggestions()
                                    if (item.result.hasPOIs()) {
                                        console.log(item.result.location)
                                        poiSearch.request(item.result, props.mapCenter, Math.min(props.mapRadius, 100))
                                    }
                                }
                                searchInput.current!.blur()
                            }}
                        />
                    </ResponsiveAutocomplete>
                )}
            </div>
        </div>
    )
}

function ResponsiveAutocomplete({
    inputRef,
    children,
    index,
    isSmallScreen,
}: {
    inputRef: HTMLElement
    children: ReactNode
    isSmallScreen: boolean
    index: number
}): JSX.Element {
    return (
        <>
            {isSmallScreen ? (
                <div className={styles.smallList}>{children}</div>
            ) : (
                <PopUp inputElement={inputRef} keepClearAtBottom={index > 5 ? 270 : 0}>
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

    request(query: string, bias: Coordinate | undefined, provider: string) {
        this.requestAsync(query, bias, provider).then(() => {})
    }

    cancel() {
        // invalidates last request if there is one
        this.getNextId()
    }

    async requestAsync(query: string, bias: Coordinate | undefined, provider: string) {
        const currentId = this.getNextId()
        this.timeout.cancel()
        if (!query || query.length < 2) return

        await this.timeout.wait()
        try {
            const options: Record<string, string> = bias
                ? { point: coordinateToText(bias), location_bias_scale: '0.5', zoom: '9' }
                : {}
            const result = await this.api.geocode(query, provider, options)
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

    static filterDuplicates(hits: GeocodingHit[]) {
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

class ReverseGeocoder {
    private requestId = 0
    private readonly timeout = new Timout(200)
    private readonly api: Api
    private readonly onSuccess: (hits: GeocodingHit[], parseResult: AddressParseResult) => void

    constructor(api: Api, onSuccess: (hits: GeocodingHit[], parseResult: AddressParseResult) => void) {
        this.api = api
        this.onSuccess = onSuccess
    }

    cancel() {
        // invalidates last request if there is one
        this.getNextId()
    }

    request(query: AddressParseResult, point: Coordinate, radius: number) {
        this.requestAsync(query, point, radius).then(() => {})
    }

    async requestAsync(parseResult: AddressParseResult, point: Coordinate, radius: number) {
        const currentId = this.getNextId()
        this.timeout.cancel()
        await this.timeout.wait()
        try {
            let hits: GeocodingHit[] = []
            let searchCoordinate: Coordinate | undefined = undefined
            if (parseResult.location) {
                let options: Record<string, string> = {
                    point: coordinateToText(point),
                    location_bias_scale: '0.5',
                    zoom: '9',
                }
                let result = await this.api.geocode(parseResult.location, 'default', options)
                hits = result.hits
                if (result.hits.length > 0) searchCoordinate = result.hits[0].point
                else if (point) searchCoordinate = point
            } else if (point) {
                searchCoordinate = point
            }

            if (!searchCoordinate) {
                hits = []
            } else if (hits.length > 0) {
                // TODO NOW should we include parseResult.location here again if searchCoordinate is from forward geocode request?
                //  parseResult.location
                console.log("radius "+radius)
                const result = await this.api.reverseGeocode('', searchCoordinate, radius, parseResult.tags)
                hits = Geocoder.filterDuplicates(result.hits)
            }

            if (currentId === this.requestId) this.onSuccess(hits, parseResult)
        } catch (reason) {
            throw Error('Could not get geocoding results because: ' + reason)
        }
    }

    private getNextId() {
        this.requestId++
        return this.requestId
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
