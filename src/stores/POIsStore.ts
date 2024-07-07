import { Coordinate, QueryPoint } from '@/stores/QueryStore'
import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { SelectPOI, SetPOIs } from '@/actions/Actions'
import { POIQuery } from '@/pois/AddressParseResult'
import { TagHash } from '@/api/graphhopper'

export interface POI {
    name: string
    queries: POIQuery[]
    tags: TagHash
    osm_id: string
    osm_type: string
    icon: string
    coordinate: Coordinate
    address: string
}

export interface POIsStoreState {
    pois: POI[]
    selected: POI | null
    oldQueryPoint: QueryPoint | null
}

export default class POIsStore extends Store<POIsStoreState> {
    constructor() {
        super({ pois: [], selected: null, oldQueryPoint: null })
    }

    reduce(state: POIsStoreState, action: Action): POIsStoreState {
        if (action instanceof SetPOIs) {
            return {
                pois: action.pois,
                oldQueryPoint: action.sourceQueryPoint,
                selected: null,
            }
        } else if (action instanceof SelectPOI) {
            return {
                ...state,
                selected: action.selected,
            }
        }
        return state
    }
}
