import route, {ghKey, RoutingArgs} from "@/routing/Api";
import Store from "@/stores/Store";
import {Action} from "@/stores/Dispatcher";

export class AddPoint implements Action {
    readonly point: [number, number]

    constructor(point: [number, number]) {
        this.point = point
    }
}

export default class QueryStore extends Store<RoutingArgs>{

    protected getInitialState(): RoutingArgs {
        return {
            points: [],
            key: ghKey,
            points_encoded: false
        };
    }

    protected reduce(state: RoutingArgs, action: Action): RoutingArgs {

        if (action instanceof AddPoint) {
            const points = QueryStore.addPoint(this.state.points, action.point)
            const newState = Object.assign({}, state, {points: points})
            if (points.length >= 2) {
                route(newState).then(() => {}) // having empty callback here to make warnings go away. I don't know whether there is a better way for a fire and forget
            }
            return newState
        }
        return state
    }

    private static addPoint(points: ReadonlyArray<[number, number]>, point: [number, number]): ReadonlyArray<[number, number]> {

        if (points.length !== 1) {
            return [point]
        } else {
            const result = Array.from(points)
            result.push(point)
            return result
        }
    }
}