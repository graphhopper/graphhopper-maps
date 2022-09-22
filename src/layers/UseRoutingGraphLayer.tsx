import { Feature, Map } from 'ol'
import React, { useEffect } from 'react'
import VectorTileSource from 'ol/source/VectorTile'
import VectorTileLayer from 'ol/layer/VectorTile'
import { MVT } from 'ol/format'
import * as config from 'config'
import { Stroke, Style } from 'ol/style'
import { Select } from 'ol/interaction'
import { pointerMove } from 'ol/events/condition'
import { SelectEvent } from 'ol/interaction/Select'
import Dispatcher from '@/stores/Dispatcher'
import { RoutingGraphHover } from '@/actions/Actions'
import { toLonLat } from 'ol/proj'

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
            url: `${config.api}mvt/{z}/{x}/{y}.mvt`,
        }),
        style: ((feature: Feature, resolution: number) =>
            getStyle(feature, map.getView().getZoomForResolution(resolution)!)) as any,
    })
    routingGraphLayer.set(routingGraphLayerKey, true)
    // make sure the routing graph layer is shown on top of the background layer, but note that this also means it is
    // on top of the vector layer text labels (for now I don't really care). the layer order is determined by both the
    // z-index and the order of the layers in map.getLayers()
    routingGraphLayer.setZIndex(0.5)
    map.addLayer(routingGraphLayer)

    const hover = new Select({
        condition: pointerMove,
        layers: [routingGraphLayer],
        hitTolerance: 5,
        // todo: in theory we could use this to highlight the hovered road which would be useful to see where it starts
        //       and ends, but the following results in an error 'feature.getStyle is not a function':
        // style: new Style({
        //     stroke: new Stroke({
        //         color: 'red'
        //     })
        // })
        style: null,
    })
    hover.on('select', (e: SelectEvent) => {
        if (e.selected.length > 0) {
            const lonLat = toLonLat(e.mapBrowserEvent.coordinate)
            // we only care about the first road
            const properties = e.selected[0].getProperties()
            Dispatcher.dispatch(new RoutingGraphHover({ lat: lonLat[1], lng: lonLat[0] }, properties))
        } else Dispatcher.dispatch(new RoutingGraphHover(null, {}))
    })
    map.addInteraction(hover)
}

function removeRoutingGraphLayer(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(routingGraphLayerKey))
        .forEach(l => map.removeLayer(l))
}
