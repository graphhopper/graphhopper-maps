import { Map, View } from 'ol'
import { fromLonLat } from 'ol/proj'
import { defaults as defaultControls } from 'ol/control'
import { store } from '@/stores/useStore'

let map: Map | undefined

export function createMap(): Map {
    map = new Map({
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

export function setMap(m: Map) {
    map = m
}
export function getMap(): Map {
    if (!map) throw Error('Map must be initialized before it can be used. Use "createMap" when starting the app')
    return map
}
