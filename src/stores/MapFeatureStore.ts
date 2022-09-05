import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { RoutingGraphHover } from '@/actions/Actions'
import { Coordinate } from '@/stores/QueryStore'

export interface MapFeatureStoreState {
    point: Coordinate | null
    properties: object
}

export default class MapFeatureStore extends Store<MapFeatureStoreState> {
    constructor() {
        super({
            point: null,
            properties: {},
        })
    }

    reduce(state: MapFeatureStoreState, action: Action): MapFeatureStoreState {
        if (action instanceof RoutingGraphHover) {
            return {
                ...state,
                point: action.point,
                properties: action.properties,
            }
        }
        return state
    }
}
