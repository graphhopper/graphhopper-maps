import { coordinateToText } from '@/Converters'
import Dispatcher from '@/stores/Dispatcher'
import {
    ClearPoints,
    DisableCustomModel,
    ErrorAction,
    SelectMapLayer,
    SetBBox,
    SetCustomModel,
    SetQueryPoints,
    SetVehicleProfile,
} from '@/actions/Actions'
// import the window like this so that it can be mocked during testing
import { window } from '@/Window'
import QueryStore, { QueryPoint, QueryPointType, QueryStoreState } from '@/stores/QueryStore'
import MapOptionsStore, { MapOptionsStoreState } from './stores/MapOptionsStore'
import { ApiImpl, getApi } from '@/api/Api'
import { AddressParseResult } from '@/pois/AddressParseResult'
import { getQueryStore } from '@/stores/Stores'
import { getBBoxFromCoord, getBBoxPoints } from '@/utils'
import { decodeCoords, encodeCoords } from '@/util/flexPolyline'
import { canCompress, deflateB64url, inflateB64url } from '@/util/urlCompress'
import { customModel2prettyString } from '@/sidebar/CustomModelExamples'

// Minimum number of (initialized) waypoints before we switch from the legible
// `point=lat,lng` format to the compact `fpolyline=` representation. For 1-3
// points the URL stays human-readable; the savings only become substantial
// once a route gets long enough to be tedious to read anyway.
const FPOLYLINE_THRESHOLD = 4

// Names delimiter inside the compressed `cnames` blob. Stripped from names on
// encode so the split on decode is unambiguous.
const NAMES_SEP = '*'

export default class NavBar {
    private readonly queryStore: QueryStore
    private readonly mapStore: MapOptionsStore
    private ignoreStateUpdates = false

    constructor(queryStore: QueryStore, mapStore: MapOptionsStore) {
        this.queryStore = queryStore
        this.mapStore = mapStore
        window.addEventListener('popstate', async () => await this.updateStateFromUrl())
    }

    async startSyncingUrlWithAppState() {
        // our first history entry shall be the one that we end up with when the app loads for the first time
        const url = await this.createUrlFromState()
        window.history.replaceState(null, '', url)
        this.queryStore.register(() => this.updateUrlFromState())
        this.mapStore.register(() => this.updateUrlFromState())
    }

    private static async createUrl(
        baseUrl: string,
        queryStoreState: QueryStoreState,
        mapState: MapOptionsStoreState,
    ): Promise<URL> {
        const result = new URL(baseUrl)
        const points = queryStoreState.queryPoints
        const allInitialized = points.length > 0 && points.every(p => p.isInitialized)

        // We only use the compact `fpolyline`/`cnames`/`cmodel` format when the
        // browser exposes CompressionStream. Older browsers fall back to the legacy
        // `point=` + `custom_model=` representation so they keep producing usable
        // (just longer) share URLs.
        const compressionAvailable = canCompress()

        if (compressionAvailable && allInitialized && points.length >= FPOLYLINE_THRESHOLD) {
            result.searchParams.append('fpolyline', encodeCoords(points.map(p => p.coordinate)))
            const names = points.map(p => {
                const coordText = coordinateToText(p.coordinate)
                return p.queryText === coordText ? '' : p.queryText.split(NAMES_SEP).join('')
            })
            if (names.some(n => n.length > 0)) {
                result.searchParams.append('cnames', await deflateB64url(names.join(NAMES_SEP)))
            }
        } else if (points.some(p => p.isInitialized)) {
            // Legacy emission for short routes, mixed-init states, and old browsers.
            // Only emits when at least one point is set so a clean app state doesn't
            // produce an ugly `?point=&point=` URL.
            points
                .map(p => (!p.isInitialized ? '' : NavBar.pointToParam(p)))
                .forEach(s => result.searchParams.append('point', s))
        }

        result.searchParams.append('profile', queryStoreState.routingProfile.name)
        result.searchParams.append('l', mapState.selectedStyle.shortName)
        if (queryStoreState.customModelEnabled) {
            const cm = queryStoreState.customModelStr.replace(/\s+/g, '')
            if (compressionAvailable) {
                result.searchParams.append('cmodel', await deflateB64url(cm))
            } else {
                result.searchParams.append('custom_model', cm)
            }
        }

        return result
    }

    private static pointToParam(point: QueryPoint) {
        const coordinate = coordinateToText(point.coordinate)
        return coordinate === point.queryText ? coordinate : coordinate + '_' + point.queryText
    }

    private static async parsePoints(url: URL): Promise<QueryPoint[]> {
        const fpolyline = url.searchParams.get('fpolyline')
        if (fpolyline) {
            let coords
            try {
                coords = decodeCoords(fpolyline)
            } catch {
                // Truncated, garbled, or future-version polyline — without coords
                // there's no route at all, so let the user know rather than showing
                // an empty map. cnames failures stay silent (names don't affect the
                // route — just the labels).
                Dispatcher.dispatch(
                    new ErrorAction(
                        'Could not decode the waypoints from the URL. The shared link may be truncated or malformed.',
                    ),
                )
                return []
            }
            const cnames = url.searchParams.get('cnames')
            let names: string[] = []
            if (cnames && canCompress()) {
                try {
                    names = (await inflateB64url(cnames)).split(NAMES_SEP)
                } catch {
                    names = []
                }
            }
            return coords.map((coordinate, idx) => ({
                coordinate,
                isInitialized: true,
                id: idx,
                queryText: names[idx] && names[idx].length > 0 ? names[idx] : coordinateToText(coordinate),
                color: '',
                type: QueryPointType.Via,
            }))
        }
        return url.searchParams.getAll('point').map((parameter, idx) => {
            const split = parameter.split('_')
            const point = {
                coordinate: { lat: 0, lng: 0 },
                isInitialized: false,
                id: idx,
                queryText: parameter,
                color: '',
                type: QueryPointType.Via,
            }
            if (split.length >= 1)
                try {
                    point.coordinate = NavBar.parseCoordinate(split[0])
                    if (!Number.isNaN(point.coordinate.lat) && !Number.isNaN(point.coordinate.lng)) {
                        point.queryText = split.length >= 2 ? split[1] : coordinateToText(point.coordinate)
                        point.isInitialized = true
                    }
                } catch (e) {}

            return point
        })
    }

    private static async parseCustomModel(url: URL): Promise<string | null> {
        const compressed = url.searchParams.get('cmodel')
        if (compressed) {
            if (canCompress()) {
                try {
                    return await inflateB64url(compressed)
                } catch {}
            }
            // cmodel is authoritative when present — don't silently swap in a
            // potentially-different `custom_model=` value as a fallback.
            Dispatcher.dispatch(
                new ErrorAction(
                    'Could not decode the custom routing model from the URL. ' +
                        'The route is being shown without the custom model and will differ from the original.',
                ),
            )
            return null
        }
        return url.searchParams.get('custom_model')
    }

    private static parseCoordinate(params: string) {
        const coordinateParams = params.split(',')
        if (coordinateParams.length !== 2) throw Error('Could not parse coordinate with value: "' + params[0] + '"')
        return {
            lat: Number.parseFloat(coordinateParams[0]),
            lng: Number.parseFloat(coordinateParams[1]),
        }
    }

    private static parseProfile(url: URL): string {
        // we can cast to string since we test for presence before
        if (url.searchParams.has('profile')) return url.searchParams.get('profile') as string
        if (url.searchParams.has('vehicle')) return url.searchParams.get('vehicle') as string

        return ''
    }

    private static parseLayer(url: URL): string | null {
        return url.searchParams.get('l') ?? url.searchParams.get('layer')
    }

    async updateStateFromUrl() {
        // We update the state several times ourselves, but we don't want to push history entries for each dispatch.
        this.ignoreStateUpdates = true

        Dispatcher.dispatch(new ClearPoints())
        const url = new URL(window.location.href)

        const parsedProfileName = NavBar.parseProfile(url)
        if (parsedProfileName)
            // this won't trigger a route request because we just cleared the points
            Dispatcher.dispatch(new SetVehicleProfile({ name: parsedProfileName }))
        const parsedPoints = await NavBar.parsePoints(url)

        // support legacy URLs without coordinates (not initialized) and only text, see #199
        if (parsedPoints.some(p => !p.isInitialized && p.queryText.length > 0)) {
            const promises = parsedPoints.map(p => {
                if (p.isInitialized) return Promise.resolve(p)
                const result = AddressParseResult.parse(p.queryText, false)
                if (result.hasPOIs() && result.location) {
                    // two stage POI search: 1. use extracted location to get coordinates 2. do reverse geocoding with this coordinates
                    return getApi()
                        .geocode(result.location, 'nominatim')
                        .then(res => {
                            if (res.hits.length == 0) return p
                            getApi()
                                .reverseGeocode(result.query, res.hits[0].extent)
                                .then(res => AddressParseResult.handleGeocodingResponse(res, result))
                            return p
                        })
                }
                return (
                    getApi()
                        .geocode(p.queryText, 'nominatim')
                        .then(res => {
                            if (res.hits.length == 0) return p
                            return {
                                ...p,
                                queryText: res.hits[0].name,
                                coordinate: { lat: res.hits[0].point.lat, lng: res.hits[0].point.lng },
                                isInitialized: true,
                            }
                        })
                        // if the geocoding request fails we just keep the point as it is, just as if no results were found
                        .catch(() => p)
                )
            })
            const points = await Promise.all(promises)
            NavBar.dispatchQueryPoints(points)
        } else {
            NavBar.dispatchQueryPoints(parsedPoints)
        }

        const parsedLayer = NavBar.parseLayer(url)
        if (parsedLayer) Dispatcher.dispatch(new SelectMapLayer(parsedLayer))

        const customModelStr = await NavBar.parseCustomModel(url)
        if (customModelStr) {
            // Pretty-print so the editor shows readable JSON (URL form is minified).
            // Mirrors QueryStore.getInitialState behaviour for the initial-load case.
            let prettyStr = customModelStr
            try {
                prettyStr = customModel2prettyString(JSON.parse(customModelStr))
            } catch {}
            Dispatcher.dispatch(new SetCustomModel(prettyStr, true))
        } else {
            Dispatcher.dispatch(new DisableCustomModel())
        }

        this.ignoreStateUpdates = false
    }

    private static dispatchQueryPoints(points: QueryPoint[]) {
        // estimate map bounds from url points if there are any. this way we prevent loading tiles for the world view
        // only to zoom to the route shortly after
        const initializedPoints = points.filter(p => p.isInitialized)
        const bbox =
            initializedPoints.length == 1
                ? getBBoxFromCoord(initializedPoints[0].coordinate)
                : getBBoxPoints(initializedPoints.map(p => p.coordinate))
        if (bbox) Dispatcher.dispatch(new SetBBox(bbox))
        return Dispatcher.dispatch(new SetQueryPoints(points))
    }

    public async updateUrlFromState() {
        if (this.ignoreStateUpdates) return
        const newHref = await this.createUrlFromState()
        if (newHref !== window.location.href) window.history.pushState(null, '', newHref)
    }

    private async createUrlFromState(): Promise<string> {
        const url = await NavBar.createUrl(
            window.location.origin + window.location.pathname,
            this.queryStore.state,
            this.mapStore.state,
        )
        return url.toString()
    }
}
