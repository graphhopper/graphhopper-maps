import { Path, RoutingResult } from '@/routing/Api'
import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { ClearRoute, RouteReceived, SetPoint } from '@/actions/Actions'

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
                type: '',
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

    protected reduce(state: RouteStoreState, action: Action): RouteStoreState {
        if (action instanceof RouteReceived) {
            return this.handleRouteReceived(action)
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

    private handleRouteReceived(action: RouteReceived) {
        if (action.result.paths.length > 0) {
            return {
                routingResult: action.result,
                selectedPath: action.result.paths[0],
            }
        }
        return this.getInitialState()
    }
}
