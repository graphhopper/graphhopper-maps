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

    // we need a filled version of navigation.svg
    const svgData =
        '<svg xmlns="http://www.w3.org/2000/svg" height="48" width="48">' +
        '<path style="fill:rgb(107,165,255); stroke:none;" d="M 24.13483,3.8557243 8.1348294,40.355724 l 1.5,1.5 14.5000006,-6.6 z M 19.605832,31.73126 Z" />' +
        '<path style="fill:rgb(3,89,194); stroke:none;" d="m 24.131517,3.8515376 16,36.4999994 -1.5,1.5 -14.5,-6.6 z m 4.528998,27.8755354 z" />' +
        '</svg>'

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
