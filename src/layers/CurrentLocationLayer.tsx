import React, { useEffect } from 'react'
import { Feature, Map } from 'ol'
import { Coordinate } from '@/stores/QueryStore'
import { Point } from 'ol/geom'
import { fromLonLat } from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Style, Icon } from 'ol/style'

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

    // TODO avoid copy of navigation.svg
    const svgData =
        '<svg xmlns="http://www.w3.org/2000/svg" height="48" width="48">' +
        '<path style="fill: rgba(128,128,128,0.2); stroke: rgb(61,109,180); stroke-width: 2" d="M9.5 42 8 40.5 24 4l16 36.5-1.5 1.5L24 35.4Zm3.4-4.9L24 32.2l11.1 4.9L24 11.4ZM24 32.2Z"/></svg>'
    currentLocationLayer.setStyle(
        feature =>
            new Style({
                image: new Icon({
                    displacement: [0, 24],
                    src: 'data:image/svg+xml;utf8,' + svgData,
                }),
            })
    )
    map.addLayer(currentLocationLayer)
    return currentLocationLayer
}
