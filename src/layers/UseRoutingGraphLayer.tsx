import { Feature, Map } from 'ol'
import React, { useEffect } from 'react'
import VectorTileSource from 'ol/source/VectorTile'
import VectorTileLayer from 'ol/layer/VectorTile'
import { MVT } from 'ol/format'
import * as config from 'config'
import { Stroke, Style } from 'ol/style'

const routingGraphLayerKey = 'routingGraphLayer'

export default function useRoutingGraphLayer(map: Map, routingGraphEnabled: boolean) {
    useEffect(() => {
        removeRoutingGraphLayer(map)
        if (routingGraphEnabled) addRoutingGraphLayer(map)
        return () => {
            removeRoutingGraphLayer(map)
        }
    }, [map, routingGraphEnabled])
}

function getStyle(feature: Feature, zoom: number): Style | undefined {
    if (feature.get('layer') === 'roads') {
        const roadClass = feature.get('road_class')
        let color = '#aaa5a7'
        let width = 1
        if (roadClass === 'motorway') {
            color = '#dd504b'
            width = 3
        } else if (roadClass === 'primary' || roadClass === 'trunk') {
            color = '#e2a012'
            width = 2
        } else if (roadClass === 'secondary') {
            color = '#f7c913'
            width = 2
        }
        if (zoom > 16) width += 3
        else if (zoom > 15) width += 2
        else if (zoom > 13) width += 1
        return new Style({
            stroke: new Stroke({
                color: color,
                width: width,
            }),
        })
    } else {
        // do not render this feature
        return undefined
    }
}

function addRoutingGraphLayer(map: Map) {
    const routingGraphLayer = new VectorTileLayer({
        declutter: true,
        source: new VectorTileSource({
            attributions: '',
            format: new MVT(),
            url: `${config.api}mvt/{z}/{x}/{y}.mvt?details=road_class&details=surface&details=road_environment&details=max_speed&details=average_speed`,
        }),
        style: ((feature: Feature, resolution: number) =>
            getStyle(feature, map.getView().getZoomForResolution(resolution)!)) as any,
    })
    routingGraphLayer.set(routingGraphLayerKey, true)
    map.addLayer(routingGraphLayer)
}

function removeRoutingGraphLayer(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(routingGraphLayerKey))
        .forEach(l => map.removeLayer(l))
}
