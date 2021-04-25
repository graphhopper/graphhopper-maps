import { coordinateToText } from '@/Converters'
import Api from '@/api/Api'
import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import {
    AddPoint,
    ClearPoints,
    InfoReceived,
    InvalidatePoint,
    RemovePoint,
    RouteRequestFailed,
    RouteRequestSuccess,
    SetPoint,
    SetVehicle,
} from '@/actions/Actions'
import { RoutingArgs, RoutingVehicle } from '@/api/graphhopper'

export interface Coordinate {
    lat: number
    lng: number
}

export interface QueryStoreState {
    readonly queryPoints: QueryPoint[]
    readonly nextQueryPointId: number
    readonly currentRequest: CurrentRequest
    readonly maxAlternativeRoutes: number
    readonly routingVehicle: RoutingVehicle
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

export interface CurrentRequest {
    subRequests: SubRequest[]
}

export enum RequestState {
    SENT,
    SUCCESS,
    FAILED,
}

export interface SubRequest {
    readonly args: RoutingArgs
    readonly state: RequestState
}

export default class QueryStore extends Store<QueryStoreState> {
    private readonly api: Api

    constructor(api: Api) {
        super()
        this.api = api
    }

    protected getInitialState(): QueryStoreState {
        return {
            queryPoints: [
                QueryStore.getEmptyPoint(0, QueryPointType.From),
                QueryStore.getEmptyPoint(1, QueryPointType.To),
            ],
            nextQueryPointId: 2,
            currentRequest: {
                subRequests: [],
            },
            maxAlternativeRoutes: 3,
            routingVehicle: {
                key: '',
                import_date: '',
                version: '',
                features: { elevation: false },
            },
        }
    }

    reduce(state: QueryStoreState, action: Action): QueryStoreState {
        if (action instanceof SetPoint) {
            const newState: QueryStoreState = {
                ...state,
                queryPoints: QueryStore.replacePoint(state.queryPoints, action.point),
            }

            return this.routeIfAllPointsSet(newState)
        } else if (action instanceof InvalidatePoint) {
            const points = QueryStore.replacePoint(state.queryPoints, {
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
            const queryText = action.isInitialized ? coordinateToText(action.coordinate) : ''

            // add new point at the desired index
            tmp.splice(action.atIndex, 0, {
                coordinate: action.coordinate,
                id: state.nextQueryPointId,
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

            const newState: QueryStoreState = {
                ...state,
                nextQueryPointId: state.nextQueryPointId + 1,
                queryPoints: newPoints,
            }

            return this.routeIfAllPointsSet(newState)
        } else if (action instanceof RemovePoint) {
            const newPoints = state.queryPoints
                .filter(point => point.id !== action.point.id)
                .map((point, i) => {
                    const type = QueryStore.getPointType(i, state.queryPoints.length - 1)
                    return { ...point, color: QueryStore.getMarkerColor(type), type: type }
                })

            const newState: QueryStoreState = {
                ...state,
                queryPoints: newPoints,
            }
            return this.routeIfAllPointsSet(newState)
        } else if (action instanceof InfoReceived) {
            // this is the case if the vehicle was set in the url. Keep it in this case
            if (state.routingVehicle.key) return state

            // otherwise select car as default routing mode
            const car = action.result.vehicles.find(vehicle => vehicle.key === 'car')
            return {
                ...state,
                routingVehicle: car ? car : action.result.vehicles[0],
            }
        } else if (action instanceof SetVehicle) {
            const newState: QueryStoreState = {
                ...state,
                routingVehicle: action.vehicle,
            }

            return this.routeIfAllPointsSet(newState)
        } else if (action instanceof RouteRequestSuccess || action instanceof RouteRequestFailed) {
            return QueryStore.handleFinishedRequest(state, action)
        }
        return state
    }

    private static handleFinishedRequest(
        state: QueryStoreState,
        action: RouteRequestSuccess | RouteRequestFailed
    ): QueryStoreState {
        const newState = action instanceof RouteRequestSuccess ? RequestState.SUCCESS : RequestState.FAILED
        const newSubrequests = QueryStore.replaceSubRequest(state.currentRequest.subRequests, action.request, newState)

        return {
            ...state,
            currentRequest: {
                subRequests: newSubrequests,
            },
        }
    }

    private routeIfAllPointsSet(state: QueryStoreState): QueryStoreState {
        if (state.queryPoints.length > 1 && state.queryPoints.every(point => point.isInitialized)) {
            const requests = [
                QueryStore.buildRouteRequest({
                    ...state,
                    maxAlternativeRoutes: 1,
                }),
            ]

            if (state.queryPoints.length === 2 && state.maxAlternativeRoutes > 1) {
                requests.push(QueryStore.buildRouteRequest(state))
            }

            return {
                ...state,
                currentRequest: { subRequests: this.send(requests) },
            }
        }
        return state
    }

    private send(args: RoutingArgs[]) {
        const subRequests = args.map(arg => {
            return {
                args: arg,
                state: RequestState.SENT,
            }
        })

        subRequests.forEach(subRequest => this.api.routeWithDispatch(subRequest.args))
        return subRequests
    }

    private static replacePoint(points: QueryPoint[], point: QueryPoint) {
        return replace(
            points,
            p => p.id === point.id,
            () => point
        )
    }

    private static replaceSubRequest(subRequests: SubRequest[], args: RoutingArgs, state: RequestState) {
        return replace(
            subRequests,
            r => r.args === args,
            r => {
                return { ...r, state }
            }
        )
    }

    private static getMarkerColor(type: QueryPointType) {
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

    private static buildRouteRequest(state: QueryStoreState): RoutingArgs {
        const coordinates = state.queryPoints.map(point => [point.coordinate.lng, point.coordinate.lat]) as [
            number,
            number
        ][]

        return {
            points: coordinates,
            vehicle: state.routingVehicle.key,
            maxAlternativeRoutes: state.maxAlternativeRoutes,
        }
    }

    private static getEmptyPoint(id: number, type: QueryPointType): QueryPoint {
        return {
            isInitialized: false,
            queryText: '',
            coordinate: { lat: 0, lng: 0},
            id: id,
            color: QueryStore.getMarkerColor(type),
            type: type,
        }
    }
}

function replace<T>(array: T[], compare: { (element: T): boolean }, provider: { (element: T): T }) {
    const result = []

    for (const element of array) {
        if (compare(element)) result.push(provider(element))
        else result.push(element)
    }

    return result
}
