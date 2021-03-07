import route, { ghKey, RoutingArgs } from '@/routing/Api'
import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { AddPoint, ClearPoints, InvalidatePoint, RemovePoint, SetPoint } from '@/actions/Actions'

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
    readonly coordinate: Coordinate
    readonly queryText: string
    readonly isInitialized: boolean
    readonly color: string
    readonly id: number
    readonly type: QueryPointType
}

export enum QueryPointType {
    From,
    To,
    Via,
}

// noinspection JSIgnoredPromiseFromCall
export default class QueryStore extends Store<QueryStoreState> {
    static getMarkerColor(type: QueryPointType) {
        switch (type) {
            case QueryPointType.From:
                return '#417900'
            case QueryPointType.To:
                return '#F97777'
            default:
                return '#76D0F7'
        }
    }

    private static getPointType(index: number, numberOfPoints: number) {
        if (index === 0) return QueryPointType.From
        if (index === numberOfPoints - 1) return QueryPointType.To
        return QueryPointType.Via
    }

    private static routeIfAllPointsSet(points: QueryPoint[]) {
        if (points.length > 1 && points.every(point => point.isInitialized)) {
            const rawPoints = points.map(point => [point.coordinate.lng, point.coordinate.lat]) as [number, number][]
            route({ points: rawPoints, key: ghKey, points_encoded: false })
        }
    }

    private static getEmptyPoint(id: number, type: QueryPointType): QueryPoint {
        return {
            isInitialized: false,
            queryText: '',
            coordinate: { lng: 0, lat: 0 },
            id: id,
            color: QueryStore.getMarkerColor(type),
            type: type,
        }
    }

    protected getInitialState(): QueryStoreState {
        return {
            queryPoints: [
                QueryStore.getEmptyPoint(0, QueryPointType.From),
                QueryStore.getEmptyPoint(1, QueryPointType.To),
            ],
            nextId: 2,
            routingArgs: {
                points: [],
                key: ghKey,
                points_encoded: false,
            },
        }
    }

    static replace(points: QueryPoint[], newPoint: QueryPoint) {
        const result = []

        for (const point of points) {
            if (point.id === newPoint.id) result.push(newPoint)
            else result.push(point)
        }

        return result
    }

    protected reduce(state: QueryStoreState, action: Action): QueryStoreState {
        if (action instanceof SetPoint) {
            const points = QueryStore.replace(state.queryPoints, action.point)
            QueryStore.routeIfAllPointsSet(points)
            return {
                ...state,
                queryPoints: points,
            }
        } else if (action instanceof InvalidatePoint) {
            const points = QueryStore.replace(state.queryPoints, {
                ...action.point,
                isInitialized: false,
            })
            return {
                ...state,
                queryPoints: points,
            }
        } else if (action instanceof ClearPoints) {
            const newPoints = state.queryPoints.map(point => {
                return {
                    ...point,
                    queryText: '',
                    point: { lat: 0, lng: 0 },
                    isInitialized: false,
                }
            })

            return {
                ...state,
                queryPoints: newPoints,
            }
        } else if (action instanceof AddPoint) {
            const tmp = state.queryPoints.slice()
            const queryText = action.isInitialized ? action.coordinate.lng + ', ' + action.coordinate.lat : ''

            // add new point at the desired index
            tmp.splice(action.atIndex, 0, {
                coordinate: action.coordinate,
                id: state.nextId,
                queryText: queryText,
                color: '',
                isInitialized: action.isInitialized,
                type: QueryPointType.Via,
            })

            // determine colors for each point. I guess this could be smarter if this needs to be faster
            const newPoints = tmp.map((point, i) => {
                const type = QueryStore.getPointType(i, tmp.length)
                return { ...point, color: QueryStore.getMarkerColor(type), type: type }
            })

            QueryStore.routeIfAllPointsSet(newPoints)

            return {
                ...state,
                nextId: state.nextId + 1,
                queryPoints: newPoints,
            }
        } else if (action instanceof RemovePoint) {
            const newPoints = state.queryPoints
                .filter(point => point.id !== action.point.id)
                .map((point, i) => {
                    const type = QueryStore.getPointType(i, state.queryPoints.length - 1)
                    return { ...point, color: QueryStore.getMarkerColor(type), type: type }
                })

            QueryStore.routeIfAllPointsSet(newPoints)

            return {
                ...state,
                queryPoints: newPoints,
            }
        }
        return state
    }
}
