import route, {GeocodingHit, GeocodingResult, ghKey, RoutingArgs} from "@/routing/Api";
import Store from "@/stores/Store";
import {Action} from "@/stores/Dispatcher";

export class AddPoint implements Action {
    readonly point: [number, number]

    constructor(point: [number, number]) {
        this.point = point
    }
}

export class SelectAddress implements Action {

    readonly hit: GeocodingHit
    readonly point: QueryPoint

    constructor(hit: GeocodingHit, point: QueryPoint) {
        this.hit = hit;
        this.point = point;
    }
}

export interface QueryStoreState {

    queryPoints: QueryPoint[]
    routingArgs: RoutingArgs
}

export interface GeocodingRequest {

    id: number
    queryPointIndex: number
    result?: GeocodingResult
}

export interface QueryPoint {
    point: { lat: number, lng: number }
    queryText: string
    isInitialized: boolean // don't know about this flag yet
    id: number
}

export default class QueryStore extends Store<QueryStoreState> {

    private static addPointToState(state: QueryStoreState, point: [number, number]) {
        const points = QueryStore.addPoint(state.routingArgs.points, point)
        const newRoutingArgs = Object.assign({}, state.routingArgs, {points: points})
        return Object.assign({}, state, {routingArgs: newRoutingArgs})
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

    private static convertToQueryText(hit: GeocodingHit) {

        let result = hit.name === hit.street ? "" : hit.name + ", "
        result += this.convertToStreet(hit)

        if (hit.postcode)
            result += hit.postcode
        if (hit.city)
            result += " " + hit.city
        if (hit.country)
            result += ", " + hit.country

        return result;
    }

    private static convertToStreet(hit: GeocodingHit) {

        if (hit.housenumber && hit.street)
            return hit.street + " " + hit.housenumber + ","
        if (hit.street)
            return hit.street + ", "
        return ""
    }

    protected getInitialState(): QueryStoreState {
        return {
            queryPoints: [
                {
                    point: {lat: 0, lng: 0},
                    queryText: '',
                    isInitialized: false,
                    id: 0
                },
                {
                    point: {lat: 0, lng: 0},
                    queryText: '',
                    isInitialized: false,
                    id: 1
                }],
            routingArgs: {
                points: [],
                key: ghKey,
                points_encoded: false
            }
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
        } else if (action instanceof SelectAddress) {

            const newPoints = Array.from(state.queryPoints)
            newPoints[action.point.id] = {
                id: action.point.id,
                isInitialized: true,
                point: action.hit.point,
                queryText: QueryStore.convertToQueryText(action.hit)
            } // this could be more robust, but since the ids are set in here, this does the job

            return {
                ...state,
                queryPoints: newPoints
            }
        }
        return state
    }
}