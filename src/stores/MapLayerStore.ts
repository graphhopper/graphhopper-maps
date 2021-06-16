import Store from '@/stores/Store'
import { ReactElement } from 'react'
import { Action } from '@/stores/Dispatcher'
import { PutMapLayer } from '@/actions/Actions'

export interface MapLayer {
    id: string
    layer: ReactElement
    interactiveLayerIds: string[]
    onClick: (feature: any) => void
}

export interface MapLayerStoreState {
    layers: { [key: string]: MapLayer }
}

export default class MapLayerStore extends Store<MapLayerStoreState> {
    protected getInitialState(): MapLayerStoreState {
        return {
            layers: {},
        }
    }

    reduce(state: MapLayerStoreState, action: Action): MapLayerStoreState {
        if (action instanceof PutMapLayer) {
            state.layers[action.mapLayer.id] = action.mapLayer
            return state
        }
        return state
    }
}
