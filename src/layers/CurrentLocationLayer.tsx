import React, { useEffect } from 'react'
import { Feature, Map } from 'ol'
import { Coordinate, QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { Point } from 'ol/geom'
import { fromLonLat } from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Circle, Fill, Stroke, Style } from 'ol/style'

export default function useCurrentLocationLayer(map: Map, location: Coordinate) {
    useEffect(() => {
        removeCurrentLocation(map)
        if (location.lat != 0 && location.lng != 0) addCurrentLocation(map, location)
    }, [map, location])
}

function removeCurrentLocation(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get('gh:current_location'))
        .forEach(l => map.removeLayer(l))
}

function addCurrentLocation(map: Map, location: Coordinate) {
    const currentLocationLayer = new VectorLayer({
        source: new VectorSource({
            features: [
                new Feature({
                    geometry: new Point(fromLonLat([location.lng, location.lat])),
                }),
            ],
        }),
    })
    currentLocationLayer.set('gh:current_location', true)
    currentLocationLayer.setZIndex(3)

    const fill = new Fill({
        color: 'rgba(255,255,255,0.4)',
    })
    const stroke = new Stroke({
        color: '#0054ff',
        width: 2,
    })

    currentLocationLayer.setStyle(
        feature =>
            new Style({
                image: new Circle({
                    fill: fill,
                    stroke: stroke,
                    radius: 10,
                }),
                fill: fill,
                stroke: stroke,
            })
    )
    map.addLayer(currentLocationLayer)
    return currentLocationLayer
}
