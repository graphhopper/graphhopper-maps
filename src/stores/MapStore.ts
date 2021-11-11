import Store from '@/stores/Store'
import Dispatcher, { Action } from '@/stores/Dispatcher'
import { Map, View } from 'ol'
import { fromLonLat } from 'ol/proj'
import { MapIsLoaded } from '@/actions/Actions'

export interface MapStoreState {
    map: Map
}

export default class MapStore extends Store<MapStoreState> {
    protected getInitialState(): MapStoreState {
        const map = new Map({
            view: new View({
                multiWorld: false,
                constrainResolution: true,
                center: fromLonLat([11.6, 49.6]),
                zoom: 10,
            }),
        })
        map.once('postrender', () => {
            Dispatcher.dispatch(new MapIsLoaded())
        })
        return {
            map,
        }
    }

    reduce(state: MapStoreState, action: Action): MapStoreState {
        return state
    }
}
