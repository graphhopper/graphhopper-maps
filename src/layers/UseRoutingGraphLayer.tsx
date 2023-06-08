import { Feature, Map, MapBrowserEvent } from 'ol'
import { useEffect } from 'react'
import VectorTileSource from 'ol/source/VectorTile'
import VectorTileLayer from 'ol/layer/VectorTile'
import { MVT } from 'ol/format'
import * as config from 'config'
import { Stroke, Style } from 'ol/style'
import Dispatcher from '@/stores/Dispatcher'
import { RoutingGraphHover } from '@/actions/Actions'
import { toLonLat } from 'ol/proj'

export default function useRoutingGraphLayer(map: Map, routingGraphEnabled: boolean) {
    useEffect(() => {
        const routingGraphLayer = new VectorTileLayer({
            declutter: true,
            source: new VectorTileSource({
                attributions: '',
                format: new MVT(),
                url: `${config.routingApi}mvt/{z}/{x}/{y}.mvt`,
            }),
            // make sure the routing graph layer is shown on top of the background layer, but note that this also means it is
            // on top of the vector layer text labels (for now I don't really care). the layer order is determined by both the
            // z-index and the order of the layers in map.getLayers()
            zIndex: 0.5,
            style: ((feature: Feature, resolution: number) =>
                getStyle(feature, map.getView().getZoomForResolution(resolution)!)) as any,
        })

        const selectionLayer = new VectorTileLayer({
            renderMode: 'vector',
            source: routingGraphLayer.getSource()!,
            zIndex: 0.6,
        })

        const onHover = (e: MapBrowserEvent<UIEvent>) => {
            const features = map.getFeaturesAtPixel(e.pixel, {
                layerFilter: l => l === routingGraphLayer,
                hitTolerance: 5,
            })
            if (features.length > 0) {
                const lonLat = toLonLat(e.coordinate)
                // we only care about the first road
                const properties = features[0].getProperties()
                selectionLayer.setStyle(feature => {
                    if (properties.edge_id && feature.getProperties().edge_id === properties.edge_id) {
                        return new Style({
                            stroke: new Stroke({
                                color: 'red',
                                width: 5,
                            }),
                        })
                    }
                    return undefined
                })
                Dispatcher.dispatch(new RoutingGraphHover({ lat: lonLat[1], lng: lonLat[0] }, properties))
            } else {
                selectionLayer.setStyle(() => undefined)
                Dispatcher.dispatch(new RoutingGraphHover(null, {}))
            }
        }

        map.removeLayer(routingGraphLayer)
        map.removeLayer(selectionLayer)
        if (routingGraphEnabled) {
            map.addLayer(routingGraphLayer)
            map.addLayer(selectionLayer)
            map.on('pointermove', onHover)
        }
        return () => {
            Dispatcher.dispatch(new RoutingGraphHover(null, {}))
            map.un('pointermove', onHover)
            map.removeLayer(routingGraphLayer)
            map.removeLayer(selectionLayer)
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
