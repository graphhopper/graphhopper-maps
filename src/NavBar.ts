import { coordinateToText } from '@/Converters'
import { Bbox, RoutingProfile } from '@/api/graphhopper'
import Dispatcher from '@/stores/Dispatcher'
import { ClearPoints, SelectMapStyle, SetInitialBBox, SetRoutingParametersAtOnce } from '@/actions/Actions'
// import the window like this so that it can be mocked during testing
import { window } from '@/Window'
import QueryStore, { Coordinate, QueryPoint, QueryPointType, QueryStoreState } from '@/stores/QueryStore'
import MapOptionsStore, { MapOptionsStoreState, StyleOption } from './stores/MapOptionsStore'

export default class NavBar {
    private readonly queryStore: QueryStore
    private readonly mapStore: MapOptionsStore
    private isIgnoreQueryStoreUpdates = false

    constructor(queryStore: QueryStore, mapStore: MapOptionsStore) {
        this.queryStore = queryStore
        this.queryStore.register(() => this.onQueryStateChanged())
        this.mapStore = mapStore
        this.mapStore.register(() => this.onQueryStateChanged())
        window.addEventListener('popstate', () => this.parseUrlAndReplaceQuery())
    }

    private static createUrl(baseUrl: string, queryStoreState: QueryStoreState, mapState: MapOptionsStoreState) {
        const result = new URL(baseUrl)
        queryStoreState.queryPoints
            .filter(point => point.isInitialized)
            .map(point => this.pointToParam(point)) //coordinateToText(point.coordinate))
            .forEach(pointAsString => result.searchParams.append('point', pointAsString))

        result.searchParams.append('profile', queryStoreState.routingProfile.name)
        result.searchParams.append('layer', mapState.selectedStyle.name)
        if (queryStoreState.customModelEnabled && queryStoreState.customModel && queryStoreState.customModelValid)
            result.searchParams.append('custom_model', JSON.stringify(queryStoreState.customModel))

        return result
    }

    private static pointToParam(point: QueryPoint) {
        const coordinate = coordinateToText(point.coordinate)
        return coordinate === point.queryText ? coordinate : coordinate + '_' + point.queryText
    }

    private parseUrl(href: string): { points: QueryPoint[]; profile: RoutingProfile; styleOption: StyleOption } {
        const url = new URL(href)

        return {
            points: NavBar.parsePoints(url),
            profile: { name: NavBar.parseProfile(url) },
            styleOption: this.parseLayer(url),
        }
    }

    private static parsePoints(url: URL) {
        return url.searchParams.getAll('point').map((parameter, i) => {
            const split = parameter.split('_')

            try {
                if (split.length >= 1) {
                    const coordinate = this.parseCoordinate(split[0])
                    const queryText = split.length >= 2 ? split[1] : coordinateToText(coordinate)
                    return {
                        coordinate: coordinate,
                        isInitialized: true,
                        id: i,
                        queryText: queryText,
                        color: '',
                        type: QueryPointType.Via,
                    }
                }
            } catch (e) {}

            return {
                coordinate: { lat: 0, lng: 0 },
                isInitialized: false,
                id: i,
                queryText: '',
                color: '',
                type: QueryPointType.Via,
            }
        })
    }

    private static parseCoordinate(params: string) {
        const coordinateParams = params.split(',')
        if (coordinateParams.length !== 2) throw Error('Could not parse coordinate with value: "' + params[0] + '"')
        return {
            lat: NavBar.parseNumber(coordinateParams[0]),
            lng: NavBar.parseNumber(coordinateParams[1]),
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
        const option = this.mapStore.state.styleOptions.find(option => option.name === layer)
        return option ? option : this.mapStore.state.selectedStyle
    }

    private static parseNumber(value: string) {
        const number = Number.parseFloat(value)
        return Number.isNaN(number) ? 0 : number
    }

    parseUrlAndReplaceQuery() {
        this.isIgnoreQueryStoreUpdates = true

        Dispatcher.dispatch(new ClearPoints())
        const parseResult = this.parseUrl(window.location.href)

        // estimate map bounds from url points if there are any. this way we prevent loading tiles for the world view
        // only to zoom to the route shortly after
        const bbox = this.getBBoxFromUrlPoints(parseResult.points.map(p => p.coordinate))
        if (bbox) Dispatcher.dispatch(new SetInitialBBox(bbox))

        // we want either all the points replaced from the url or we just have one and we want to replace the one default
        // one
        const points = parseResult.points.length > 2 ? parseResult.points : this.fillPoints(parseResult.points)
        const profile = parseResult.profile.name ? parseResult.profile : this.queryStore.state.routingProfile
        Dispatcher.dispatch(new SetRoutingParametersAtOnce(points, profile))

        // add map style
        Dispatcher.dispatch(new SelectMapStyle(parseResult.styleOption))

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
            this.mapStore.state
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
