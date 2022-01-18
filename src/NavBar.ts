import { coordinateToText } from '@/Converters'
import { Bbox, RoutingProfile } from '@/api/graphhopper'
import Dispatcher from '@/stores/Dispatcher'
import { AddPoint, RemovePoint, SelectMapStyle, SetInitialBBox, SetVehicleProfile } from '@/actions/Actions'
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
            .map(point => coordinateToText(point.coordinate))
            .forEach(pointAsString => result.searchParams.append('point', pointAsString))

        result.searchParams.append('profile', queryStoreState.routingProfile.name)
        result.searchParams.append('layer', mapState.selectedStyle.name)

        return result
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
        return url.searchParams
            .getAll('point')
            .map(parameter => {
                const split = parameter.split(',')
                if (split.length !== 2)
                    throw Error(
                        'Could not parse url parameter point: ' +
                            parameter +
                            ' Think about what to do instead of crashing'
                    )
                return { lat: NavBar.parseNumber(split[0]), lng: NavBar.parseNumber(split[1]) }
            })
            .map((coordinate, i): QueryPoint => {
                return {
                    coordinate: coordinate,
                    isInitialized: true,
                    id: i,
                    queryText: '',
                    color: '',
                    type: QueryPointType.Via,
                }
            })
    }

    private static parseProfile(url: URL) {
        let profileKey = url.searchParams.get('profile')
        return profileKey ? profileKey : ''
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

        //const parseResult = NavBar.parseUrl(this.appContext.location.href)
        const parseResult = this.parseUrl(window.location.href)

        // estimate map bounds from url points if there are any. this way we prevent loading tiles for the world view
        // only to zoom to the route shortly after
        const bbox = this.getBBoxFromUrlPoints(parseResult.points.map(p => p.coordinate))
        if (bbox) Dispatcher.dispatch(new SetInitialBBox(bbox))

        // remove old query points
        this.queryStore.state.queryPoints.forEach(point => Dispatcher.dispatch(new RemovePoint(point)))

        // add parsed points
        parseResult.points.forEach((point, i) => Dispatcher.dispatch(new AddPoint(i, point.coordinate, true)))

        // assuming that at least two points should be present add un-initialized points if necessary
        for (let i = this.queryStore.state.queryPoints.length; i < 2; i++) {
            Dispatcher.dispatch(new AddPoint(i, { lat: 0, lng: 0 }, false))
        }

        // add routing profile
        Dispatcher.dispatch(new SetVehicleProfile(parseResult.profile))

        // add map style
        Dispatcher.dispatch(new SelectMapStyle(parseResult.styleOption))

        this.isIgnoreQueryStoreUpdates = false
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
