import route, {geocode, GeocodingHit, GeocodingResult, ghKey, RoutingArgs} from "@/routing/Api";
import Store from "@/stores/Store";
import {Action} from "@/stores/Dispatcher";

export class AddPoint implements Action {
    readonly point: [number, number]

    constructor(point: [number, number]) {
        this.point = point
    }
}

export class QueryAddress implements Action {

    readonly query: string

    constructor(query: string) {
        this.query = query
    }
}

export class SelectAddress implements Action {

    readonly osm_id: string

    constructor(osm_id: string) {
        this.osm_id = osm_id
    }
}

export class GeocodingReceived implements Action {

    readonly result: GeocodingResult
    readonly requestId: number

    constructor(result: GeocodingResult, requestId: number) {
        this.result = result
        this.requestId = requestId
    }
}

export interface QueryStoreState {

    routingArgs: RoutingArgs
    geocodingRequestId: number
    geocodingResults: GeocodingHit[] // type the geocoding results

}

export default class QueryStore extends Store<QueryStoreState> {

    private static addPointToState(state: QueryStoreState, point: [number, number]) {
        const points = QueryStore.addPoint(state.routingArgs.points, point)
        const newRoutingArgs = Object.assign({}, state.routingArgs, {points: points})
        return Object.assign({}, state, {routingArgs: newRoutingArgs})
    }

    protected getInitialState(): QueryStoreState {
        return {
            routingArgs: {
                points: [],
                key: ghKey,
                points_encoded: false
            },
            geocodingRequestId: 0,
            geocodingResults: []

        };
    }

    protected reduce(state: QueryStoreState, action: Action): QueryStoreState {

        if (action instanceof AddPoint) {
            const newState = QueryStore.addPointToState(state, action.point)
            if (newState.routingArgs.points.length >= 2) {
                route(newState.routingArgs).then(() => {
                }) // having empty callback here to make warnings go away. I don't know whether there is a better way for a fire and forget
            }
            return newState
        } else if (action instanceof QueryAddress) {

            // remember the query we are interested in i.e. set an id
            const nextId = state.geocodingRequestId + 1;
            const newState = Object.assign({}, state, {geocodingRequestId: nextId})

            // send a request to the api
            geocode(action.query, nextId).then(() => {
            })
            return newState

        } else if (action instanceof GeocodingReceived) {

            // check whether we are interested in the result
            if (action.requestId === state.geocodingRequestId) {
                // if so change the state with the suggestions from the api
                return Object.assign({}, state, {geocodingResults: action.result.hits})
            }
        } else if (action instanceof SelectAddress) {

            // select an address from the address result list previously fetched from the geocoding api
            // Do we need error checking here? I don't think so, because one should only be able to select things in the list
            const geocodingResult = state.geocodingResults.find(result => result.osm_id === action.osm_id)

            if (geocodingResult) {
                // make typescript happy
                const newState = QueryStore.addPointToState(state, [geocodingResult.point.lng, geocodingResult.point.lat])
                if (newState.routingArgs.points.length >= 2) {
                    route(newState.routingArgs).then(() => {
                    }) // having empty callback here to make warnings go away. I don't know whether there is a better way for a fire and forget
                }
                return newState;
            }
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