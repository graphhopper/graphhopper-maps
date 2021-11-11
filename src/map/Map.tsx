import styles from '@/map/Map.module.css'
import { QueryPoint } from '@/stores/QueryStore'
import React, { useEffect, useRef, useState } from 'react'
import { RasterStyle, StyleOption } from '@/stores/MapOptionsStore'
import { ViewportStoreState } from '@/stores/ViewportStore'
import { MapLayer } from '@/layers/MapLayer'
import { Map, View } from 'ol'
import { XYZ } from 'ol/source'
import TileLayer from 'ol/layer/Tile'
import { fromLonLat } from 'ol/proj'
import Dispatcher from '@/stores/Dispatcher'
import { MapIsLoaded, SelectMapStyle } from '@/actions/Actions'
import addLayers from 'ol-mapbox-style'
import { Group } from 'ol/layer'

type MapProps = {
    viewport: ViewportStoreState
    queryPoints: QueryPoint[]
    styleOption: StyleOption
    mapLayers: MapLayer[]
}

export default function ({ viewport, styleOption, queryPoints, mapLayers }: MapProps) {
    const [map, setMap] = useState<Map>()
    const mapElement = useRef<any>()

    useEffect(() => {
        if (!map) return
        // remove all layers (map.getLayers(l => map.removeLayer(l)) is not ok because it modifies the collection that is being iterated)
        map.setLayerGroup(new Group());
        if (styleOption.type === 'vector') {
            addLayers(map, styleOption.url)
        } else {
            const rasterStyle = styleOption as RasterStyle
            map.addLayer(
                new TileLayer({
                    source: new XYZ({
                        urls: rasterStyle.url,
                    }),
                })
            )
        }
    }, [styleOption])

    useEffect(() => {
        const initialMap = new Map({
            target: mapElement.current,
            view: new View({
                multiWorld: false,
                constrainResolution: true,
                center: fromLonLat([11.6, 49.6]),
                zoom: 10,
            }),
        })
        initialMap.once('postrender', () => {
            Dispatcher.dispatch(new MapIsLoaded())
            // our useEffect for styleOption does nothing when the map is not initialized yet, so here we trigger it again
            Dispatcher.dispatch(new SelectMapStyle({...styleOption}))
        })
        setMap(initialMap)
    }, [])
    return <div ref={mapElement} className={styles.mapContainer} />
}
