import route, {GeocodingHit, ghKey, RoutingArgs} from "@/routing/Api";
import Store from "@/stores/Store";
import {Action} from "@/stores/Dispatcher";

export interface Coordinate {
    lat: number,
    lng: number
}

export class SetPointFromCoordinate implements Action {

    readonly coordinate: Coordinate
    readonly point: QueryPoint

    constructor(coordinate: Coordinate, point: QueryPoint) {
        this.coordinate = coordinate;
        this.point = point;
    }
}

export class SetPointFromAddress implements Action {

    readonly hit: GeocodingHit
    readonly point: QueryPoint

    constructor(hit: GeocodingHit, point: QueryPoint) {
        this.hit = hit;
        this.point = point;
    }
}

export class ClearPoints implements Action {
}

export class InvalidatePoint implements Action {

    readonly point: QueryPoint

    constructor(point: QueryPoint) {
        this.point = point;
    }
}

export interface QueryStoreState {

    queryPoints: QueryPoint[]
    routingArgs: RoutingArgs
}

export interface QueryPoint {
    point: Coordinate
    queryText: string
    isInitialized: boolean // don't know about this flag yet
    id: number
}

// noinspection JSIgnoredPromiseFromCall
export default class QueryStore extends Store<QueryStoreState> {

    private static convertToQueryText(hit: GeocodingHit) {

        let result = hit.name === hit.street ? "" : hit.name + ", "
        result += this.convertToStreet(hit)
        result += this.convertToCity(hit)
        result += this.convertToCountry(hit)

        return result;
    }

    private static convertToStreet(hit: GeocodingHit) {

        if (hit.housenumber && hit.street)
            return hit.street + " " + hit.housenumber + ", "
        if (hit.street)
            return hit.street + ", "
        return ""
    }

    private static convertToCity(hit: GeocodingHit) {
        if (hit.city && hit.postcode)
            return hit.postcode + " " + hit.city + ", "
        if (hit.city)
            return hit.city + ", "
        if (hit.postcode)
            return hit.postcode + ", "
        return ""
    }

    private static convertToCountry(hit: GeocodingHit) {
        return hit.country ? hit.country : ""
    }

    private static setPoint(state: QueryStoreState, newPoint: QueryPoint) {
        const newPoints = Array.from(state.queryPoints)
        newPoints[newPoint.id] = newPoint

        if (newPoints.every(point => point.isInitialized)) {
            const rawPoints = newPoints.map(point => [point.point.lng, point.point.lat]) as [number, number][]
            route({points: rawPoints, key: ghKey, points_encoded: false})
        }

        return {
            ...state,
            queryPoints: newPoints
        }
    }

    private static getEmptyPoint(id: number): QueryPoint {
        return {
            isInitialized: false,
            queryText: '',
            point: {lng: 0, lat: 0},
            id: id
        }
    }

    protected getInitialState(): QueryStoreState {
        return {
            queryPoints: [QueryStore.getEmptyPoint(0), QueryStore.getEmptyPoint(1)],
            routingArgs: {
                points: [],
                key: ghKey,
                points_encoded: false
            }
        };
    }

    protected reduce(state: QueryStoreState, action: Action): QueryStoreState {

        if (action instanceof SetPointFromCoordinate) {

            return QueryStore.setPoint(state, {
                id: action.point.id,
                isInitialized: true,
                point: action.coordinate,
                queryText: action.coordinate.lng + ", " + action.coordinate.lat
            })
        } else if (action instanceof SetPointFromAddress) {

            return QueryStore.setPoint(state, { // taking the index from the point could be more robust, but since the ids are set in here, this does the job
                id: action.point.id,
                isInitialized: true,
                point: action.hit.point,
                queryText: QueryStore.convertToQueryText(action.hit)
            })
        } else if (action instanceof InvalidatePoint) {

            return QueryStore.setPoint(state, {
                ...action.point,
                isInitialized: false
            })
        } else if (action instanceof ClearPoints) {

            const newPoints = state.queryPoints
                .map((point, i) => QueryStore.getEmptyPoint(i))

            return {
                ...state,
                queryPoints: newPoints
            }
        }
        return state
    }
}