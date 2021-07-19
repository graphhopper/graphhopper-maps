import QueryStore, { QueryPoint, QueryPointType, QueryStoreState } from '@/stores/QueryStore'
import { coordinateToText } from '@/Converters'
import { RoutingProfile } from '@/api/graphhopper'
import Dispatcher from '@/stores/Dispatcher'
import { AddPoint, RemovePoint, SetVehicleProfile } from '@/actions/Actions'

export interface AppContext {
    addEventListener(type: string, listener: () => void): void

    readonly location: Location
    readonly history: History
}

export default class NavBar {
    private readonly queryStore: QueryStore
    private readonly appContext: AppContext
    private isIgnoreQueryStoreUpdates = false

    constructor(queryStore: QueryStore, appContext: AppContext) {
        this.queryStore = queryStore
        this.queryStore.register(() => this.onQueryStoreChanged())
        this.appContext = appContext
        appContext.addEventListener('popstate', () => this.parseUrlAndReplaceQuery())
    }

    private static createUrl(baseUrl: string, state: QueryStoreState) {
        const result = new URL(baseUrl)
        state.queryPoints
            .filter(point => point.isInitialized)
            .map(point => coordinateToText(point.coordinate))
            .forEach(pointAsString => result.searchParams.append('point', pointAsString))

        result.searchParams.append('profile', state.routingProfile.name)

        return result
    }

    private static parseUrl(href: string): { points: QueryPoint[]; profile: RoutingProfile } {
        const url = new URL(href)

        return {
            points: NavBar.parsePoints(url),
            profile: { name: NavBar.parseProfile(url) },
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
            .map(
                (coordinate, i): QueryPoint => {
                    return {
                        coordinate: coordinate,
                        isInitialized: true,
                        id: i,
                        queryText: '',
                        color: '',
                        type: QueryPointType.Via,
                    }
                }
            )
    }

    private static parseProfile(url: URL) {
        let profileKey = url.searchParams.get('profile')
        if (!profileKey) profileKey = 'car'
        return profileKey
    }

    private static parseNumber(value: string) {
        const number = Number.parseFloat(value)
        return Number.isNaN(number) ? 0 : number
    }

    parseUrlAndReplaceQuery() {
        this.isIgnoreQueryStoreUpdates = true

        const parseResult = NavBar.parseUrl(this.appContext.location.href)

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

        this.isIgnoreQueryStoreUpdates = false
    }

    private onQueryStoreChanged() {
        if (this.isIgnoreQueryStoreUpdates) return

        const newHref = NavBar.createUrl(
            this.appContext.location.origin + this.appContext.location.pathname,
            this.queryStore.state
        ).toString()

        if (newHref !== this.appContext.location.href) this.appContext.history.pushState('last state', '', newHref)
    }
}
