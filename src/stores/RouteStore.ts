import {RoutingResult} from "@/routing/Api";
import Store from "@/stores/Store";
import {Action} from "@/stores/Dispatcher";

export class RouteReceived implements Action {
    readonly result: RoutingResult

    constructor(result: RoutingResult) {
        this.result = result
    }
}

export default class RouteStore extends Store<RoutingResult> {
    protected getInitialState(): RoutingResult {
        return {
            paths: [],
            info: {
                copyright: [],
                took: 0
            }
        }
    }

    protected reduce(state: RoutingResult, action: Action): RoutingResult {

        if (action instanceof RouteReceived) {
            return action.result
        }
        return state
    }
}