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
import { MapIsLoaded } from '@/actions/Actions'

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
        map.getLayers().forEach(l => map.removeLayer(l))
        if (styleOption.type === 'vector') console.log('vector not supported')
        else {
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
        })
        setMap(initialMap)
    }, [])
    return <div ref={mapElement} className={styles.mapContainer} />
}
