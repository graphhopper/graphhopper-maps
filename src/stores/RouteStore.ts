import {Path, RoutingResult} from "@/routing/Api";
import Store from "@/stores/Store";
import {Action} from "@/stores/Dispatcher";
import {AddPoint} from "@/stores/QueryStore";

export class RouteReceived implements Action {
    readonly result: RoutingResult

    constructor(result: RoutingResult) {
        this.result = result
    }
}

export interface RouteStoreState {
    routingResult: RoutingResult
    selectedPath: Path
}

export default class RouteStore extends Store<RouteStoreState> {
    protected getInitialState(): RouteStoreState {
        return {
            routingResult: {
                paths: [],
                info: {
                    copyright: [],
                    took: 0
                }
            },
            selectedPath: RouteStore.getEmptyPath()
        }
    }

    protected reduce(state: RouteStoreState, action: Action): RouteStoreState {

        if (action instanceof RouteReceived) {
            return this.handleRouteReceived(state, action)
        } else if (action instanceof AddPoint) {
            return this.getInitialState() // clear the current path
        }
        return state
    }

    private handleRouteReceived(state: RouteStoreState, action: RouteReceived) {

        if (action.result.paths.length > 0) {
            return Object.assign({}, state, {routingResult: action.result, selectedPath: action.result.paths[0]})
        }
        return this.getInitialState()
    }

    private static getEmptyPath(): Path {
        return {
            bbox: [0, 0, 0, 0],
            instructions: [],
            points: {
                coordinates: [],
                type: "",
            },
            points_encoded: false,
            snapped_waypoints: {
                type: "",
                coordinates: []
            },
            ascend: 0,
            descend: 0,
            details: {
                max_speed: [],
                street_name: [],
                toll: []
            },
            distance: 0,
            points_order: [],
            time: 0
        }
    }
}