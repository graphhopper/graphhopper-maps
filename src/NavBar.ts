import { coordinateToText } from '@/Converters'
import { Bbox, RoutingProfile } from '@/api/graphhopper'
import Dispatcher from '@/stores/Dispatcher'
import { ClearPoints, SetRoutingParametersAtOnce } from '@/actions/Actions'
// import the window like this so that it can be mocked during testing
import { window } from '@/Window'
import QueryStore, { Coordinate, QueryPoint, QueryPointType, QueryStoreState } from '@/stores/QueryStore'
import { getApi } from '@/api/Api'
import { store } from '@/stores/useStore'

export default class NavBar {
    private readonly queryStore: QueryStore
    private isIgnoreQueryStoreUpdates = false

    constructor(queryStore: QueryStore) {
        this.queryStore = queryStore
        this.queryStore.register(() => this.onQueryStateChanged())
        // todo: limit updates to certain parts of the state (we need to return the ones we are interested:
        // https://docs.pmnd.rs/zustand/recipes/recipes#reading/writing-state-and-reacting-to-changes-outside-of-components
        store.subscribe(() => this.onQueryStateChanged())
        window.addEventListener('popstate', () => this.parseUrlAndReplaceQuery())
    }

    private static createUrl(baseUrl: string, queryStoreState: QueryStoreState, layerName: string) {
        const result = new URL(baseUrl)
        queryStoreState.queryPoints
            .filter(point => point.isInitialized)
            .map(point => this.pointToParam(point)) //coordinateToText(point.coordinate))
            .forEach(pointAsString => result.searchParams.append('point', pointAsString))

        result.searchParams.append('profile', queryStoreState.routingProfile.name)
        result.searchParams.append('layer', layerName)
        if (queryStoreState.customModelEnabled && queryStoreState.customModel && queryStoreState.customModelValid)
            result.searchParams.append('custom_model', JSON.stringify(queryStoreState.customModel))

        return result
    }

    private static pointToParam(point: QueryPoint) {
        const coordinate = coordinateToText(point.coordinate)
        return coordinate === point.queryText ? coordinate : coordinate + '_' + point.queryText
    }

    private parsePoints(url: URL, profile: RoutingProfile): QueryPoint[] {
        const points = url.searchParams.getAll('point').map((parameter, idx) => {
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

        // support legacy URLs without coordinates (not initialized) and only text, see #199
        if (points.some(p => !p.isInitialized && p.queryText.length > 0)) {
            if (!profile.name) profile = { name: 'car' }
            let fullyInitPoints: QueryPoint[] = Array.from({ length: points.length })
            points.forEach((p, idx) => {
                if (p.isInitialized) fullyInitPoints[idx] = p
                else
                    getApi()
                        .geocode(p.queryText, 'nominatim')
                        .then(res => {
                            if (res.hits.length <= 0) return
                            fullyInitPoints[idx] = {
                                ...p,
                                queryText: res.hits[0].name,
                                coordinate: { lat: res.hits[0].point.lat, lng: res.hits[0].point.lng },
                                isInitialized: true,
                            }
                            if (fullyInitPoints.every(p => p.isInitialized)) {
                                if (fullyInitPoints.length <= 2) this.fillPoints(fullyInitPoints)
                                Dispatcher.dispatch(new SetRoutingParametersAtOnce(fullyInitPoints, profile))
                            }
                        })
            })
            return [] // skip normal SetRoutingParametersAtOnce
        }

        // this ensures that if no or one point parameter is specified in the URL there are still two input fields
        return points.length > 2 ? points : this.fillPoints(points)
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

    private parseLayer(url: URL) {
        let layer = url.searchParams.get('layer')
        const option = store.getState().styleOptions.find(option => option.name === layer)
        return option ? option : store.getState().selectedStyle
    }

    parseUrlAndReplaceQuery() {
        this.isIgnoreQueryStoreUpdates = true

        Dispatcher.dispatch(new ClearPoints())
        const url = new URL(window.location.href)

        const parsedProfileName = NavBar.parseProfile(url)
        const profile = parsedProfileName ? { name: parsedProfileName } : this.queryStore.state.routingProfile
        const parsedPoints = this.parsePoints(url, profile)

        // estimate map bounds from url points if there are any. this way we prevent loading tiles for the world view
        // only to zoom to the route shortly after
        const bbox = this.getBBoxFromUrlPoints(parsedPoints.map(p => p.coordinate))
        if (bbox) store.getState().setInitialBbox(bbox)

        if (parsedPoints.length > 0) Dispatcher.dispatch(new SetRoutingParametersAtOnce(parsedPoints, profile))

        // add map style
        const parsedStyleOption = this.parseLayer(url)
        store.getState().selectMapStyle(parsedStyleOption)

        this.isIgnoreQueryStoreUpdates = false
    }

    private fillPoints(parsedPoints: QueryPoint[]) {
        const result: QueryPoint[] = this.queryStore.state.queryPoints

        // assuming that at least two points should be present add un-initialized points if necessary
        for (let i = 0; i < result.length && i < parsedPoints.length; i++) {
            result[i] = parsedPoints[i]
        }

        return result
    }

    private onQueryStateChanged() {
        if (this.isIgnoreQueryStoreUpdates) return

        const newHref = NavBar.createUrl(
            window.location.origin + window.location.pathname,
            this.queryStore.state,
            store.getState().selectedStyle.name
        ).toString()

        if (newHref !== window.location.href) window.history.pushState('last state', '', newHref)
    }

    private getBBoxFromUrlPoints(urlPoints: Coordinate[]): Bbox | null {
        const bbox: Bbox = urlPoints.reduce(
            (res: Bbox, c) => [
                Math.min(res[0], c.lng),
                Math.min(res[1], c.lat),
                Math.max(res[2], c.lng),
                Math.max(res[3], c.lat),
            ],
            [180, 90, -180, -90] as Bbox
        )
        // return null if the bbox is not valid, e.g. if no url points were given at all
        return bbox[0] < bbox[2] && bbox[1] < bbox[3] ? bbox : null
    }
}
