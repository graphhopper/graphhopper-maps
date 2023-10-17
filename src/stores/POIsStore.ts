import { Coordinate } from '@/stores/QueryStore'
import Store from '@/stores/Store'
import Dispatcher, { Action } from '@/stores/Dispatcher'
import { ErrorAction, SearchPOI, SetPOI } from '@/actions/Actions'
import Api from '@/api/Api'

export interface POI {
    name: string
    icon: string
    coordinate: Coordinate
    selected: boolean
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
        } else if (action instanceof SearchPOI) {
            this.api
                .geocodePOIs(action.query, action.coordinate, action.radius)
                .then(r => {
                    const pois = r.hits.map(r => ({ name: r.name, coordinate: r.point, icon: action.icon } as POI))

                    // TODO NOW 1. query again automatically if map is moved?
                    // TODO NOW 2. do not remove old POIs if we just moved the map and they are still visible

                    Dispatcher.dispatch(new SetPOI(pois))
                })
                .catch(e => {
                    Dispatcher.dispatch(new ErrorAction('Cannot find POIs with query ' + action.query))
                })
        }
        return state
    }
}
