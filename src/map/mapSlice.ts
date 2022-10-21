import { Map, View } from 'ol'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'
import { store } from '@/stores/useStore'
import { StateCreator } from 'zustand'
import { Bbox } from '@/api/graphhopper'
import { Coordinate } from '@/stores/QueryStore'

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
    setInitialBbox: (b: Bbox) => void
    zoomMapToPoint: (c: Coordinate, zoom: number) => void
    zoomToPathDetailRangeBox: (b: Bbox | null) => void
}

export const createMapSlice: StateCreator<MapSlice> = (set, get) => ({
    map: createMap(),
    isMapLoaded: false,
    setMapIsLoaded: () => set(() => ({ isMapLoaded: true })),
    setInitialBbox: (bbox: Bbox) => {
        // we estimate the map size to be equal to the window size. we don't know better at this point, because
        // the map has not been rendered for the first time yet
        fitBounds(get().map, bbox, /*todonow: isSmallScreen*/ false, [window.innerWidth, window.innerHeight])
    },
    zoomMapToPoint: (coordinate: Coordinate, zoom: number) => {
        get()
            .map.getView()
            .animate({
                zoom: zoom,
                center: fromLonLat([coordinate.lng, coordinate.lat]),
                duration: 400,
            })
    },
    zoomToPathDetailRangeBox: (pathDetailBox: Bbox | null) => {
        // we either use the bbox from the path detail selection or go back to the route bbox when the path details
        // were deselected
        const bbox = pathDetailBox ? pathDetailBox : null // todonow: this.routeStore.state.selectedPath.bbox
        if (bbox) fitBounds(get().map, bbox, /*todonow: isSmallScreen*/ false)
        // if neither has a bbox just fall through to unchanged state
    },
})

function fitBounds(map: Map, bbox: Bbox, isSmallScreen: boolean, mapSize?: number[]) {
    const sw = fromLonLat([bbox[0], bbox[1]])
    const ne = fromLonLat([bbox[2], bbox[3]])
    map.getView().fit([sw[0], sw[1], ne[0], ne[1]], {
        size: mapSize ? mapSize : map.getSize(),
        padding: isSmallScreen ? [200, 16, 32, 16] : [100, 100, 300, 500],
    })
}
