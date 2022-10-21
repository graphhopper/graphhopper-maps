import { Map, View } from 'ol'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'
import { store } from '@/stores/useStore'
import { StateCreator } from 'zustand'

function createMap(): Map {
    const map = new Map({
        view: new View({
            enableRotation: false,
            multiWorld: false,
            constrainResolution: true,
            center: fromLonLat([10, 10]),
            zoom: 2,
        }),
        controls: defaultControls({
            zoom: false,
            attribution: true,
            attributionOptions: {
                collapsible: false,
            },
        }),
    })
    map.once('postrender', () => {
        store.getState().setMapIsLoaded()
    })
    return map
}

export interface MapSlice {
    map: Map
    isMapLoaded: boolean
    setMapIsLoaded: () => void
}

export const createMapSlice: StateCreator<MapSlice> = set => ({
    map: createMap(),
    isMapLoaded: false,
    setMapIsLoaded: () => set(() => ({ isMapLoaded: true }))
})