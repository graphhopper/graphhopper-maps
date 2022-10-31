import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { InstructionClicked, RoutingGraphHover } from '@/actions/Actions'
import { Coordinate } from '@/stores/QueryStore'

export interface MapFeatureStoreState {
    roadAttributesCoordinate: Coordinate | null
    roadAttributes: object
    instructionCoordinate: Coordinate | null
    instructionText: string
}

export default class MapFeatureStore extends Store<MapFeatureStoreState> {
    constructor() {
        super({
            roadAttributesCoordinate: null,
            roadAttributes: {},
            instructionCoordinate: null,
            instructionText: '',
        })
    }

    reduce(state: MapFeatureStoreState, action: Action): MapFeatureStoreState {
        if (action instanceof RoutingGraphHover) {
            return {
                ...state,
                roadAttributesCoordinate: action.point,
                roadAttributes: action.properties,
            }
        } else if (action instanceof InstructionClicked) {
            return {
                ...state,
                instructionCoordinate: action.coordinate,
                instructionText: action.text,
            }
        }
        return state
    }
}
