import route, { GeocodingHit, ghKey, RoutingArgs } from '@/routing/Api'
import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'

export class SetPointFromCoordinate implements Action {
    readonly coordinate: Coordinate
    readonly point: QueryPoint

    constructor(coordinate: Coordinate, point: QueryPoint) {
        this.coordinate = coordinate
        this.point = point
    }
}

export class SetPointFromAddress implements Action {
    readonly hit: GeocodingHit
    readonly point: QueryPoint

    constructor(hit: GeocodingHit, point: QueryPoint) {
        this.hit = hit
        this.point = point
    }
}

export class AddPoint implements Action {}

export class ClearPoints implements Action {}

export class RemovePoint implements Action {
    readonly point: QueryPoint

    constructor(point: QueryPoint) {
        this.point = point
    }
}

export class InvalidatePoint implements Action {
    readonly point: QueryPoint

    constructor(point: QueryPoint) {
        this.point = point
    }
}

export interface Coordinate {
    lat: number
    lng: number
}

export interface QueryStoreState {
    readonly queryPoints: QueryPoint[]
    readonly nextId: number
    readonly routingArgs: RoutingArgs
}

export interface QueryPoint {
    readonly point: Coordinate
    readonly queryText: string
    readonly isInitialized: boolean // don't know about this flag yet
    readonly color: string
    readonly id: number
}

// noinspection JSIgnoredPromiseFromCall
export default class QueryStore extends Store<QueryStoreState> {
    private static convertToQueryText(hit: GeocodingHit) {
        let result = hit.name === hit.street ? '' : hit.name + ', '
        result += this.convertToStreet(hit)
        result += this.convertToCity(hit)
        result += this.convertToCountry(hit)

        return result
    }

    private static convertToStreet(hit: GeocodingHit) {
        if (hit.housenumber && hit.street) return hit.street + ' ' + hit.housenumber + ', '
        if (hit.street) return hit.street + ', '
        return ''
    }

    private static convertToCity(hit: GeocodingHit) {
        if (hit.city && hit.postcode) return hit.postcode + ' ' + hit.city + ', '
        if (hit.city) return hit.city + ', '
        if (hit.postcode) return hit.postcode + ', '
        return ''
    }

    private static convertToCountry(hit: GeocodingHit) {
        return hit.country ? hit.country : ''
    }

    static getMarkerColor(index: number, length: number) {
        if (index === 0) return '#417900'
        if (index === length - 1) return '#F97777'
        return '#76D0F7'
    }

    private static setPoint(queryPoints: QueryPoint[], newPoint: QueryPoint) {
        const index = queryPoints.findIndex(point => point.id === newPoint.id)
        const newPoints = queryPoints.slice()

        if (index === -1) newPoints.push(newPoint)
        else newPoints[index] = newPoint

        this.routeIfAllPointsSet(newPoints)
        return newPoints
    }

    private static routeIfAllPointsSet(points: QueryPoint[]) {
        if (points.every(point => point.isInitialized)) {
            const rawPoints = points.map(point => [point.point.lng, point.point.lat]) as [number, number][]
            route({ points: rawPoints, key: ghKey, points_encoded: false })
        }
    }

    private static getEmptyPoint(id: number, color: string): QueryPoint {
        return {
            isInitialized: false,
            queryText: '',
            point: { lng: 0, lat: 0 },
            id: id,
            color: color,
        }
    }

    protected getInitialState(): QueryStoreState {
        return {
            queryPoints: [
                QueryStore.getEmptyPoint(0, QueryStore.getMarkerColor(0, 2)),
                QueryStore.getEmptyPoint(1, QueryStore.getMarkerColor(1, 2)),
            ],
            nextId: 2,
            routingArgs: {
                points: [],
                key: ghKey,
                points_encoded: false,
            },
        }
    }

    protected reduce(state: QueryStoreState, action: Action): QueryStoreState {
        if (action instanceof SetPointFromCoordinate) {
            const points = QueryStore.setPoint(state.queryPoints, {
                id: action.point.id,
                isInitialized: true,
                point: action.coordinate,
                color: action.point.color,
                queryText: action.coordinate.lng + ', ' + action.coordinate.lat,
            })
            return {
                ...state,
                queryPoints: points,
            }
        } else if (action instanceof SetPointFromAddress) {
            const points = QueryStore.setPoint(state.queryPoints, {
                // taking the index from the point could be more robust, but since the ids are set in here, this does the job
                id: action.point.id,
                isInitialized: true,
                point: action.hit.point,
                color: action.point.color,
                queryText: QueryStore.convertToQueryText(action.hit),
            })
            return {
                ...state,
                queryPoints: points,
            }
        } else if (action instanceof InvalidatePoint) {
            const points = QueryStore.setPoint(state.queryPoints, {
                ...action.point,
                isInitialized: false,
            })
            return {
                ...state,
                queryPoints: points,
            }
        } else if (action instanceof ClearPoints) {
            const newPoints = state.queryPoints.map((point, i) =>
                QueryStore.getEmptyPoint(state.nextId + i, QueryStore.getMarkerColor(i, state.queryPoints.length))
            )

            return {
                ...state,
                nextId: state.nextId + newPoints.length,
                queryPoints: newPoints,
            }
        } else if (action instanceof AddPoint) {
            const points = QueryStore.setPoint(
                state.queryPoints,
                QueryStore.getEmptyPoint(
                    state.nextId,
                    QueryStore.getMarkerColor(state.queryPoints.length - 1, state.queryPoints.length)
                )
            )
            return {
                ...state,
                nextId: state.nextId + 1,
                queryPoints: points,
            }
        } else if (action instanceof RemovePoint) {
            const newPoints = state.queryPoints.filter(point => point.id !== action.point.id)

            QueryStore.routeIfAllPointsSet(newPoints)

            return {
                ...state,
                queryPoints: newPoints,
            }
        }
        return state
    }
}
