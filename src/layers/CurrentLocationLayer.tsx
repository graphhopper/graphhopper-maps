import React, { useEffect } from 'react'
import { Feature, Map } from 'ol'
import { Coordinate } from '@/stores/QueryStore'
import { Point } from 'ol/geom'
import { fromLonLat } from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Circle, Fill, Stroke, Style } from 'ol/style'

export default function useCurrentLocationLayer(map: Map, location: Coordinate) {
    useEffect(() => {
        let layer = findLayer(map)
        if (location.lat != 0 && location.lng != 0) {
            if (layer == null) addCurrentLocation(map, location)
            else changeLocation(layer, location)
        }
    }, [map, location])
}

function findLayer(map: Map): any {
    let layers = map
        .getLayers()
        .getArray()
        .filter(l => l.get('gh:current_location'))
    return layers.length > 0 && layers[0] instanceof VectorLayer && layers[0].getSource() instanceof VectorSource
        ? layers[0]
        : null
}

function changeLocation(layer: VectorLayer<VectorSource>, location: Coordinate) {
    // TODO animate movement https://openlayers.org/en/latest/examples/feature-move-animation.html
    let feature = layer.getSource()?.getFeatures()[0] as Feature
    feature.setGeometry(new Point(fromLonLat([location.lng, location.lat])))
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
