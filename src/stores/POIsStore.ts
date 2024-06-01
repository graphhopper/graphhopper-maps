import { Coordinate } from '@/stores/QueryStore'
import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { SetPOI } from '@/actions/Actions'
import Api from '@/api/Api'

export interface POI {
    name: string
    icon: string
    coordinate: Coordinate
}

export interface POIsStoreState {
    pois: POI[]
}

export default class POIsStore extends Store<POIsStoreState> {
    private readonly api: Api

    constructor(api: Api) {
        super({ pois: [] })
        this.api = api
    }

    reduce(state: POIsStoreState, action: Action): POIsStoreState {
        if (action instanceof SetPOI) {
            return {
                pois: action.pois,
            }
        }
        return state
    }
}
