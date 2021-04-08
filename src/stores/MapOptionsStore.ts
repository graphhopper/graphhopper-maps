import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { MapIsLoaded, SelectMapStyle } from '@/actions/Actions'

export interface MapOptionsStoreState {
    styleOptions: StyleOption[]
    selectedStyle: StyleOption
    isMapLoaded: boolean
}

export interface StyleOption {
    name: string
    type: 'raster' | 'vector'
    url: string
    attribution: string
}

export default class MapOptionsStore extends Store<MapOptionsStoreState> {
    protected getInitialState(): MapOptionsStoreState {
        const defaultStyle: StyleOption = {
            name: 'Mapbox',
            url: 'mapbox://styles/mapbox/streets-v11',
            type: 'vector',
            attribution: 'mapbox',
        }
        return {
            selectedStyle: defaultStyle,
            styleOptions: [
                defaultStyle,
                {
                    name: 'Osm',
                    type: 'raster',
                    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    attribution:
                        '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
                },
            ],
            isMapLoaded: false,
        }
    }

    reduce(state: MapOptionsStoreState, action: Action): MapOptionsStoreState {
        if (action instanceof SelectMapStyle) {
            return {
                ...state,
                selectedStyle: action.styleOption,
                isMapLoaded: false,
            }
        } else if (action instanceof MapIsLoaded) {
            return {
                ...state,
                isMapLoaded: true,
            }
        }
        return state
    }
}
