import { QueryPoint } from '@/stores/QueryStore'
import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { SelectPOI, SetPOIs } from '@/actions/Actions'
import { POIQuery } from '@/pois/AddressParseResult'
import { TagHash } from '@/api/graphhopper'
import { Coordinate } from '@/utils'

export interface POI {
    name: string
    query: POIQuery
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
}

export default class POIsStore extends Store<POIsStoreState> {
    constructor() {
        super({ pois: [], selected: null })
    }

    reduce(state: POIsStoreState, action: Action): POIsStoreState {
        if (action instanceof SetPOIs) {
            return {
                pois: action.pois,
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
