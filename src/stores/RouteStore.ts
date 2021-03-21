import { Path, RoutingResult } from '@/routing/Api'
import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { ClearRoute, RouteReceived, SetPoint, SetSelectedPath } from '@/actions/Actions'
import QueryStore from '@/stores/QueryStore'

export interface RouteStoreState {
    routingResult: RoutingResult
    selectedPath: Path
}

export default class RouteStore extends Store<RouteStoreState> {
    private static getEmptyPath(): Path {
        return {
            bbox: [0, 0, 0, 0],
            instructions: [],
            points: {
                coordinates: [],
                type: 'LineString',
            },
            points_encoded: false,
            snapped_waypoints: {
                type: '',
                coordinates: [],
            },
            ascend: 0,
            descend: 0,
            details: {
                max_speed: [],
                street_name: [],
                toll: [],
            },
            distance: 0,
            points_order: [],
            time: 0,
        }
    }

    private readonly queryStore: QueryStore

    constructor(queryStore: QueryStore) {
        super()
        this.queryStore = queryStore
    }

    protected reduce(state: RouteStoreState, action: Action): RouteStoreState {
        if (action instanceof RouteReceived) {
            return this.reduceRouteReceived(state, action)
        } else if (action instanceof SetSelectedPath) {
            return {
                ...state,
                selectedPath: action.path,
            }
        } else if (action instanceof SetPoint || action instanceof ClearRoute) {
            return this.getInitialState()
        }
        return state
    }

    protected getInitialState(): RouteStoreState {
        return {
            routingResult: {
                paths: [],
                info: {
                    copyright: [],
                    took: 0,
                },
            },
            selectedPath: RouteStore.getEmptyPath(),
        }
    }

    private reduceRouteReceived(state: RouteStoreState, action: RouteReceived) {
        console.log('requestId: ' + action.requestId + ', currentRequestId: ' + this.queryStore.state.currentRequestId)

        if (this.isStaleRequest(action.requestId)) return state

        if (RouteStore.containsPaths(action.result.paths)) {
            return {
                routingResult: action.result,
                selectedPath: action.result.paths[0],
            }
        }
        return this.getInitialState()
    }

    private isStaleRequest(requestId: number) {
        return requestId !== this.queryStore.state.currentRequestId
    }

    private static containsPaths(paths: Path[]) {
        return paths.length > 0
    }
}
