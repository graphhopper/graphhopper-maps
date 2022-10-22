import Dispatcher from '@/stores/Dispatcher'
import { Map, View } from 'ol'
import { fromLonLat } from 'ol/proj'
import { MapIsLoaded } from '@/actions/Actions'
import { defaults as defaultControls, Zoom } from 'ol/control'
import styles from "@/map/Map.module.css";

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
            zoom: true,
            zoomOptions: {
                className: styles.customZoom
            },
            attribution: true,
            attributionOptions: {
                collapsible: false,
                className: styles.customAttribution,
                expandClassName: styles.customAttribution
            },
        }),
    })
    map.once('postrender', () => {
        Dispatcher.dispatch(new MapIsLoaded())
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
