import { JSX, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { Bbox, GeocodingHit, ReverseGeocodingHit } from '@/api/graphhopper'
import Autocomplete, {
    AutocompleteItem,
    GeocodingItem,
    POIQueryItem,
    RecentLocationItem,
} from '@/sidebar/search/AddressInputAutocomplete'
import { getRecentLocations, saveRecentLocation } from '@/sidebar/search/RecentLocations'
import { SettingsContext } from '@/contexts/SettingsContext'
import ArrowBack from './arrow_back.svg'
import Cross from '@/sidebar/times-solid-thin.svg'
import CurrentLocationIcon from './current-location.svg'
import styles from './AddressInput.module.css'
import Api, { getApi } from '@/api/Api'
import { tr } from '@/translation/Translation'
import { coordinateToText, hitToItem, nominatimHitToItem, textToCoordinate } from '@/Converters'
import { useMediaQuery } from 'react-responsive'
import PopUp from '@/sidebar/search/PopUp'
import PlainButton from '@/PlainButton'
import { onCurrentLocationSelected } from '@/map/MapComponent'
import { toLonLat, transformExtent } from 'ol/proj'
import { Map } from 'ol'
import { AddressParseResult } from '@/pois/AddressParseResult'
import { getMap } from '@/map/map'
import { calcDist, Coordinate, getBBoxFromCoord } from '@/utils'

export interface AddressInputProps {
    point: QueryPoint
    points: QueryPoint[]
    onCancel: () => void
    onAddressSelected: (queryText: string, coord: Coordinate | undefined) => void
    onChange: (value: string) => void
    clearDragDrop: () => void
    moveStartIndex: number
    dropPreviewIndex: number
    index: number
    map: Map
}

export default function AddressInput(props: AddressInputProps) {
    const saveRecent = useContext(SettingsContext).saveRecentLocations
    const [origText, setOrigText] = useState(props.point.queryText)
    // controlled component pattern with initial value set from props
    const [text, setText] = useState(props.point.queryText)
    useEffect(() => setText(props.point.queryText), [props.point.queryText])

    // keep track of focus and toggle fullscreen display on small screens
    const [hasFocus, setHasFocus] = useState(false)
    const isSmallScreen = useMediaQuery({ query: '(max-width: 44rem)' })
    const prevPoint = props.index > 0 ? props.points[props.index - 1] : undefined
    const excludeCoord = prevPoint?.isInitialized ? prevPoint.coordinate : undefined

    // container for geocoding results which gets set by the geocoder class and set to empty if the underlying query
    // point gets changed from outside also gets filled with an item to select the current location as input if input
    // has focus and geocoding results are empty
    const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([])
    const [geocoder] = useState(
        new Geocoder(getApi(), (query, provider, hits) => {
            const items: AutocompleteItem[] = []
            const parseResult = AddressParseResult.parse(query, true)
            if (parseResult.hasPOIs()) items.push(new POIQueryItem(parseResult))

            hits.forEach(hit => {
                const obj = hitToItem(hit)
                items.push(
                    new GeocodingItem(
                        obj.mainText,
                        obj.secondText,
                        hit.point,
                        hit.extent ? hit.extent : getBBoxFromCoord(hit.point),
                    ),
                )
            })

            setOrigText(query)
            setAutocompleteItems(items)
        }),
    )

    const [poiSearch] = useState(new ReverseGeocoder(getApi(), props.point, AddressParseResult.handleGeocodingResponse))

    // if item is selected we need to clear the autocompletion list
    useEffect(() => {
        if (props.point.isInitialized) setAutocompleteItems([])
    }, [props.point])

    useEffect(() => {
        if (hasFocus && !isInitialFocus.current && text === '') {
            const recents = buildRecentItems(undefined, 5, excludeCoord)
            if (recents.length > 0) setAutocompleteItems(recents)
        }
        isInitialFocus.current = false
    }, [hasFocus, excludeCoord])

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
            if (event.key === 'Escape') {
                setText(origText)
                searchInput.current!.blur()
                return
            }

            switch (event.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                    setHighlightedResult(i => {
                        if (i < 0) setText(origText)
                        const delta = event.key === 'ArrowUp' ? -1 : 1
                        const nextIndex = calculateHighlightedIndex(autocompleteItems.length, i, delta)
                        if (autocompleteItems.length > 0) {
                            if (nextIndex < 0) {
                                setText(origText)
                            } else if (nextIndex >= 0) {
                                const item = autocompleteItems[nextIndex]
                                if (item instanceof GeocodingItem || item instanceof RecentLocationItem)
                                    setText(item.mainText)
                                else setText(origText)
                            }
                        }
                        return nextIndex
                    })

                    event.preventDefault() // stop propagating event to input to avoid that cursor is moved to start when ArrowUp
                    break
                case 'Enter':
                case 'Tab':
                    // try to parse input as coordinate. Otherwise query nominatim
                    const coordinate = textToCoordinate(text)
                    if (coordinate) {
                        props.onAddressSelected(text, coordinate)
                    } else if (autocompleteItems.length > 0) {
                        const index = highlightedResult >= 0 ? highlightedResult : 0
                        const item = autocompleteItems[index]
                        if (item instanceof POIQueryItem) {
                            handlePoiSearch(poiSearch, item.result, props.map)
                            props.onAddressSelected(item.result.text(item.result.poi), undefined)
                        } else if (item instanceof RecentLocationItem) {
                            props.onAddressSelected(item.toText(), item.point)
                        } else if (highlightedResult < 0 && !props.point.isInitialized) {
                            // by default use the first result, otherwise the highlighted one
                            getApi()
                                .geocode(text, 'nominatim')
                                .then(result => {
                                    if (result && result.hits.length > 0) {
                                        const hit: GeocodingHit = result.hits[0]
                                        const res = nominatimHitToItem(hit)
                                        props.onAddressSelected(res.mainText + ', ' + res.secondText, hit.point)
                                        if (saveRecent) saveRecentLocation(res.mainText, res.secondText, hit.point)
                                    } else if (item instanceof GeocodingItem) {
                                        props.onAddressSelected(item.toText(), item.point)
                                        if (saveRecent) saveRecentLocation(item.mainText, item.secondText, item.point)
                                    }
                                })
                        } else if (item instanceof GeocodingItem) {
                            props.onAddressSelected(item.toText(), item.point)
                            if (saveRecent) saveRecentLocation(item.mainText, item.secondText, item.point)
                        }
                    }
                    if (event.key === 'Enter') focusNextOrBlur()
                    break
            }
        },
        [autocompleteItems, highlightedResult],
    )

    const focusNextOrBlur = () => {
        const next = document
            .querySelector<HTMLElement>('[data-search-box]')!
            .querySelectorAll<HTMLInputElement>('input[type="text"]')[props.index + 1]
        if (next) next.focus()
        else searchInput.current!.blur()
    }

    // the "fullscreen" css is only defined for smallscreen
    const containerClass = hasFocus ? styles.fullscreen : ''
    const type = props.point.type

    // get the bias point for the geocoder
    const lonlat = toLonLat(getMap().getView().getCenter()!)
    const biasCoord = { lng: lonlat[0], lat: lonlat[1] }

    // do not focus on mobile as we would hide the map with the "input"-view
    const focusFirstInput = props.index == 0 && !isSmallScreen
    const isInitialFocus = useRef(focusFirstInput)

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
                    onMouseDown={
                        e => e.preventDefault() // prevents that input->onBlur is called when just "mouse down" event (lose focus only for onClick)
                    }
                    onClick={() => searchInput.current!.blur()}
                >
                    <ArrowBack />
                </PlainButton>
                <input
                    style={props.moveStartIndex == props.index ? { borderWidth: '2px', margin: '-1px' } : {}}
                    className={styles.input}
                    type="text"
                    autoFocus={focusFirstInput}
                    ref={searchInput}
                    autoComplete="off"
                    onChange={e => {
                        const query = e.target.value
                        setText(query)
                        if (query === '') {
                            geocoder.cancel()
                            const recents = buildRecentItems(undefined, 5, excludeCoord)
                            if (recents.length > 0) setAutocompleteItems(recents)
                            else setAutocompleteItems([])
                        } else {
                            const coordinate = textToCoordinate(query)
                            if (!coordinate) {
                                if (query.length < 2) {
                                    const recents = buildRecentItems(query, 5, excludeCoord)
                                    if (recents.length > 0) setAutocompleteItems(recents)
                                }
                                geocoder.request(query, biasCoord, getMap().getView().getZoom())
                            }
                        }
                        props.onChange(query)
                    }}
                    onKeyDown={onKeypress}
                    onFocus={() => {
                        setHasFocus(true)
                        props.clearDragDrop()
                    }}
                    onBlur={() => {
                        setHasFocus(false)
                        geocoder.cancel()
                        setAutocompleteItems([])
                    }}
                    value={text}
                    placeholder={tr(
                        type == QueryPointType.From ? 'from_hint' : type == QueryPointType.To ? 'to_hint' : 'via_hint',
                    )}
                />

                <PlainButton
                    tabIndex={-1}
                    style={text.length == 0 ? { display: 'none' } : {}}
                    className={styles.btnInputClear}
                    onMouseDown={
                        e => e.preventDefault() // prevents that input->onBlur is called when clicking the button (would hide this button and prevent onClick)
                    }
                    onClick={e => {
                        setText('')
                        props.onChange('')
                        const recents = buildRecentItems(undefined, 5, excludeCoord)
                        if (recents.length > 0) setAutocompleteItems(recents)
                        else setAutocompleteItems([])
                        // if we clear the text without focus then explicitly request it to improve usability:
                        searchInput.current!.focus()
                    }}
                >
                    <Cross />
                </PlainButton>

                <PlainButton
                    tabIndex={-1}
                    style={text.length == 0 && hasFocus ? {} : { display: 'none' }}
                    className={styles.btnCurrentLocation}
                    onMouseDown={
                        e => e.preventDefault() // prevents that input->onBlur is called when clicking the button (would hide this button and prevent onClick)
                    }
                    onClick={() => {
                        onCurrentLocationSelected(props.onAddressSelected)
                        // but when clicked => we want to lose the focus e.g. to close mobile-input view
                        searchInput.current!.blur()
                    }}
                >
                    <CurrentLocationIcon />
                </PlainButton>

                {hasFocus && autocompleteItems.length > 0 && (
                    <ResponsiveAutocomplete
                        inputRef={searchInputContainer.current!}
                        index={props.index}
                        isSmallScreen={isSmallScreen}
                    >
                        <Autocomplete
                            items={autocompleteItems}
                            highlightedItem={autocompleteItems[highlightedResult]}
                            onSelect={item => {
                                if (item instanceof GeocodingItem) {
                                    setText(item.toText())
                                    props.onAddressSelected(item.toText(), item.point)
                                    if (saveRecent) saveRecentLocation(item.mainText, item.secondText, item.point)
                                } else if (item instanceof RecentLocationItem) {
                                    setText(item.toText())
                                    props.onAddressSelected(item.toText(), item.point)
                                } else if (item instanceof POIQueryItem) {
                                    handlePoiSearch(poiSearch, item.result, props.map)
                                    setText(item.result.text(item.result.poi))
                                }
                                focusNextOrBlur()
                            }}
                        />
                    </ResponsiveAutocomplete>
                )}
            </div>
        </div>
    )
}

function buildRecentItems(filter?: string, limit?: number, excludeCoord?: Coordinate): RecentLocationItem[] {
    let recents = getRecentLocations(0)
    if (excludeCoord) recents = recents.filter(e => calcDist({ lat: e.lat, lng: e.lng }, excludeCoord) > 0)
    if (filter) {
        const lower = filter.toLowerCase()
        recents = recents.filter(
            e =>
                e.mainText.toLowerCase().startsWith(lower) ||
                e.secondText
                    .toLowerCase()
                    .split(/[\s,]+/)
                    .some(word => word.startsWith(lower)),
        )
    }
    if (limit) recents = recents.slice(0, limit)
    return recents.map(e => new RecentLocationItem(e.mainText, e.secondText, { lat: e.lat, lng: e.lng }))
}

function handlePoiSearch(poiSearch: ReverseGeocoder, result: AddressParseResult, map: Map) {
    if (!result.hasPOIs()) return

    const origExtent = map.getView().calculateExtent(map.getSize())
    const extent = transformExtent(origExtent, 'EPSG:3857', 'EPSG:4326')
    poiSearch.request(result, extent as Bbox)
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
    if (nextIndex >= length) return -1
    if (nextIndex < -1) return length - 1
    return nextIndex
}

/**
 * This could definitely be achieved with an effect. But after trying for a while I saved some money and wrote it the
 * Way I know. If we hire an 10+ react developer, this should be changed.
 */
class Geocoder {
    private requestId = 0
    private readonly timeout = new Timout(100)
    private readonly api: Api
    private readonly onSuccess: (query: string, provider: string, hits: GeocodingHit[]) => void

    constructor(api: Api, onSuccess: (query: string, provider: string, hits: GeocodingHit[]) => void) {
        this.api = api
        this.onSuccess = onSuccess
    }

    request(query: string, bias: Coordinate | undefined, zoom = 11) {
        this.requestAsync(query, bias, zoom).then(() => {})
    }

    cancel() {
        // invalidates last request if there is one
        this.getNextId()
    }

    async requestAsync(query: string, bias: Coordinate | undefined, zoom: number | undefined) {
        zoom = Math.round(zoom ?? 11)
        const provider = 'default'
        const currentId = this.getNextId()
        this.timeout.cancel()
        if (!query || query.length < 2) return

        await this.timeout.wait()
        try {
            const options: Record<string, string> = bias
                ? { point: coordinateToText(bias), location_bias_scale: '0.5', zoom: '' + (zoom + 1) }
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

export class ReverseGeocoder {
    private requestId = 0
    private readonly timeout = new Timout(200)
    private readonly api: Api
    private readonly onSuccess: (
        hits: ReverseGeocodingHit[],
        parseResult: AddressParseResult,
        queryPoint: QueryPoint,
    ) => void
    private readonly queryPoint: QueryPoint

    constructor(
        api: Api,
        queryPoint: QueryPoint,
        onSuccess: (hits: ReverseGeocodingHit[], parseResult: AddressParseResult, queryPoint: QueryPoint) => void,
    ) {
        this.api = api
        this.onSuccess = onSuccess
        this.queryPoint = queryPoint
    }

    cancel() {
        // invalidates last request if there is one
        this.getNextId()
    }

    request(query: AddressParseResult, bbox: Bbox) {
        this.requestAsync(query, bbox).then(() => {})
    }

    async requestAsync(parseResult: AddressParseResult, bbox: Bbox) {
        const currentId = this.getNextId()
        this.timeout.cancel()
        await this.timeout.wait()
        try {
            let hits: ReverseGeocodingHit[] = []
            if (parseResult.location) {
                let options: Record<string, string> = {
                    point: coordinateToText({ lat: (bbox[1] + bbox[3]) / 2, lng: (bbox[0] + bbox[2]) / 2 }),
                    location_bias_scale: '0.5',
                    zoom: '9',
                }
                const fwdSearch = await this.api.geocode(parseResult.location, 'default', options)
                if (fwdSearch.hits.length > 0) {
                    const bbox = fwdSearch.hits[0].extent
                        ? fwdSearch.hits[0].extent
                        : getBBoxFromCoord(fwdSearch.hits[0].point, 0.01)
                    if (bbox) hits = await this.api.reverseGeocode(parseResult.query, bbox)
                }
            } else {
                hits = await this.api.reverseGeocode(parseResult.query, bbox)
            }
            if (currentId === this.requestId) this.onSuccess(hits, parseResult, this.queryPoint)
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
