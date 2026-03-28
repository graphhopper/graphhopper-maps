import Dispatcher from '@/stores/Dispatcher'
import { Map, View } from 'ol'
import { fromLonLat } from 'ol/proj'
import { MapIsLoaded, StopSyncCurrentLocation } from '@/actions/Actions'
import { defaults as defaultControls } from 'ol/control'
import { defaults as defaultInteractions } from 'ol/interaction'
import { MouseWheelZoom } from 'ol/interaction'
import styles from '@/map/Map.module.css'

let map: Map | undefined

export function createMap(): Map {
    map = new Map({
        view: new View({
            enableRotation: false,
            multiWorld: false,
            center: fromLonLat([10, 10]),
            zoom: 2,
        }),
        interactions: defaultInteractions({
            mouseWheelZoom: false,
        }).extend([
            new MouseWheelZoom({
                constrainResolution: true,
                timeout: 200,
            }),
        ]),
        controls: defaultControls({
            zoom: true,
            zoomOptions: {
                className: styles.customZoom,
            },
            attribution: true,
            attributionOptions: {
                className: styles.customAttribution,
                collapsible: false,
            },
        }),
    })
    map.once('postrender', () => {
        Dispatcher.dispatch(new MapIsLoaded())
    })

    map.on('pointerdrag', () => {
        if (!getMap().getView().getAnimating()) Dispatcher.dispatch(new StopSyncCurrentLocation())
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
