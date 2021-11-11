import styles from '@/map/Map.module.css'
import { QueryPoint } from '@/stores/QueryStore'
import React, { useEffect, useRef, useState } from 'react'
import { StyleOption } from '@/stores/MapOptionsStore'
import { ViewportStoreState } from '@/stores/ViewportStore'
import { MapLayer } from '@/layers/MapLayer'
import { Map, View } from 'ol'
import { OSM } from 'ol/source'
import TileLayer from 'ol/layer/Tile'
import { fromLonLat } from 'ol/proj'

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
        const initialMap = new Map({
            target: mapElement.current,
            layers: [
                new TileLayer({
                    source: new OSM(),
                }),
            ],
            view: new View({
                multiWorld: false,
                constrainResolution: true,
                center: fromLonLat([11.6, 49.6]),
                zoom: 10,
            }),
        })
        setMap(initialMap)
    }, [])
    return <div ref={mapElement} className={styles.mapContainer} />
}
