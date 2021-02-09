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
    readonly queryPointIndex: number

    constructor(query: string, queryPointIndex: number) {
        this.query = query
        this.queryPointIndex = queryPointIndex
    }
}

export class ClearGeocodingResults implements Action {

}

export class SelectAddress implements Action {

    readonly osm_id: string

    constructor(osm_id: string) {
        this.osm_id = osm_id
    }
}

export class GeocodingReceived implements Action {

    readonly result: GeocodingResult;
    readonly requestId: number;

    constructor(result: GeocodingResult, requestId: number) {
        this.result = result
        this.requestId = requestId
    }
}

export interface QueryStoreState {

    query: Query
    routingArgs: RoutingArgs
    currentGeocodingRequest: Geocoding
}

export interface Geocoding {

    query: string,
    id: number
    queryPointIndex: number
    result?: GeocodingResult
}

export interface Query {
    queryPoints: QueryPoint[]
}

export interface QueryPoint {
    lat: number
    lon: number
    queryString: string
    isInitialized: boolean // don't know about this flag yet
}

export default class QueryStore extends Store<QueryStoreState> {

    private static addPointToState(state: QueryStoreState, point: [number, number]) {
        const points = QueryStore.addPoint(state.routingArgs.points, point)
        const newRoutingArgs = Object.assign({}, state.routingArgs, {points: points})
        return Object.assign({}, state, {routingArgs: newRoutingArgs})
    }

    private static queryAddress(state: QueryStoreState, query: string, queryPointIndex: number): QueryStoreState {

        // replace the query point with the new text
        const newQueryPoints = Array.from(state.query.queryPoints)
        newQueryPoints[queryPointIndex] = {
            queryString: query,
            isInitialized: false,
            lon: 0,
            lat: 0
        }

        if (query) {

            const request: Geocoding = {
                id: state.currentGeocodingRequest.id + 1,
                queryPointIndex: queryPointIndex,
                query: query
            }

            const newState: QueryStoreState = {
                ...state,
                currentGeocodingRequest: request,
                query: {queryPoints: newQueryPoints}
            }

            // send a request to the api
            geocode(query, request.id).then(() => {
            })
            return newState
        } else {

            return {
                ...state,
                query: {queryPoints: newQueryPoints},
                currentGeocodingRequest: {
                    id: state.currentGeocodingRequest.id,
                    queryPointIndex: queryPointIndex,
                    query: '',
                    result: {hits: [], took: -1}
                }
            }
        }
    }

    private static filterDuplicates(hits: GeocodingHit[]) {

        const set: Set<string> = new Set()
        return hits.filter(hit => {
            if (!set.has(hit.osm_id)) {
                set.add(hit.osm_id)
                return true
            }
            return false
        })
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

    protected getInitialState(): QueryStoreState {
        return {
            query: {
                queryPoints: [{lat: 0, lon: 0, queryString: '', isInitialized: false}, {
                    lat: 0,
                    lon: 0,
                    queryString: '',
                    isInitialized: false
                }]
            },
            routingArgs: {
                points: [],
                key: ghKey,
                points_encoded: false
            },
            currentGeocodingRequest: {
                id: -1,
                query: '',
                queryPointIndex: -1,
                result: {
                    took: -1,
                    hits: []
                }
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
        } else if (action instanceof QueryAddress) {

            return QueryStore.queryAddress(state, action.query, action.queryPointIndex)
        } else if (action instanceof GeocodingReceived) {

            // check whether we are interested in the result
            if (action.requestId === state.currentGeocodingRequest.id && action.result) {
                // if so change the state with the suggestions from the api
                const distinctHits = QueryStore.filterDuplicates(action.result.hits)

                return {
                    ...state,
                    currentGeocodingRequest: {
                        ...state.currentGeocodingRequest,
                        result: {
                            took: action.result.took,
                            hits: distinctHits
                        }
                    }
                }
            }
        } else if (action instanceof SelectAddress && state.currentGeocodingRequest.result) {

            // select an address from the address result list previously fetched from the geocoding api
            // Do we need error checking here? I don't think so, because one should only be able to select things in the list
            const geocodingResult = state.currentGeocodingRequest.result.hits.find(result => result.osm_id === action.osm_id)

            if (geocodingResult) {
                // make typescript happy
                const newState = QueryStore.addPointToState(state, [geocodingResult.point.lng, geocodingResult.point.lat])
                if (newState.routingArgs.points.length >= 2) {
                    route(newState.routingArgs).then(() => {
                    }) // having empty callback here to make warnings go away. I don't know whether there is a better way for a fire and forget
                }
                return newState;
            }
        } else if (action instanceof ClearGeocodingResults) {
            return {
                ...state,
                currentGeocodingRequest: {
                    id: -1,
                    queryPointIndex: -1,
                    query: ''
                }
            }
        }
        return state
    }
}