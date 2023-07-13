import { Feature, Map, MapBrowserEvent } from 'ol'
import { useEffect } from 'react'
import VectorTileSource from 'ol/source/VectorTile'
import VectorTileLayer from 'ol/layer/VectorTile'
import { MVT } from 'ol/format'
import { Fill, Stroke, Style } from 'ol/style'
import { toLonLat } from 'ol/proj'
import { RoutingGraphHover } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import * as config from 'config'

export default function useExternalMVTLayer(map: Map, externalMVTLayerEnabled: boolean) {
    useEffect(() => {
        const externalMVTLayer = new VectorTileLayer({
            declutter: true,
            source: new VectorTileSource({
                attributions: '',
                format: new MVT({
                    // without this we won't be able to simply add the features to the selectionSource below, see: https://gis.stackexchange.com/a/407634
                    featureClass: Feature,
                }),
                url: config.externalMVTLayer ? config.externalMVTLayer.url : '',
                maxZoom: config.externalMVTLayer ? config.externalMVTLayer.maxZoom : 14,
            }),
            // without this the features become very blurry when we zoom beyond the maximum zoom level of the mvt source
            renderMode: 'vector',
            // make sure this layer is on top of the background layer
            zIndex: 0.6,
            style: ((feature: Feature) => getStyle(feature)) as any,
        })

        // We use a separate VectorLayer (not VectorTileLayer) to highlight the hovered feature. We need this because
        // the vector tile source often only supports a maximum zoom level of, e.g. 14 or 15, and when we zoom beyond this
        // updating the style (needed to highlight the feature) no longer works.
        const selectionSource = new VectorSource()
        const selectionLayer = new VectorLayer({
            source: selectionSource,
            zIndex: 0.7,
            style: feature => {
                const style = config.externalMVTLayer.styles[feature.get('layer')] as any
                return new Style({
                    stroke: new Stroke({
                        color: [252, 144, 175],
                        width: style.width * 1.2,
                    }),
                })
            },
        })

        const onHover = (e: MapBrowserEvent<UIEvent>) => {
            selectionSource.clear()
            const features = map.getFeaturesAtPixel(e.pixel, {
                layerFilter: l => l === externalMVTLayer,
                hitTolerance: 5,
            })
            if (features.length > 0) {
                selectionSource.addFeatures(features as any)
                const lonLat = toLonLat(e.coordinate)
                // we only display the properties of the first feature
                const properties = features[0].getProperties()
                Dispatcher.dispatch(new RoutingGraphHover({ lat: lonLat[1], lng: lonLat[0] }, properties))
            } else {
                Dispatcher.dispatch(new RoutingGraphHover(null, {}))
            }
        }

        map.removeLayer(externalMVTLayer)
        map.removeLayer(selectionLayer)
        if (externalMVTLayerEnabled) {
            map.addLayer(externalMVTLayer)
            map.addLayer(selectionLayer)
            map.on('pointermove', onHover)
        }
        return () => {
            map.un('pointermove', onHover)
            map.removeLayer(externalMVTLayer)
            map.removeLayer(selectionLayer)
        }
    }, [map, externalMVTLayerEnabled])
}

function getStyle(feature: Feature): Style | undefined {
    const style = config.externalMVTLayer.styles[feature.get('layer')]
    if (style)
        return new Style({
            stroke: new Stroke({
                color: [...(style.color as any), 1],
                width: style.width,
            }),
            fill: new Fill({
                color: [...(style.color as any), 0.3],
            }),
        })
    // do not render this feature
    else return undefined
}

function brighten(hexColor: string, amount: number) {
    const red = parseInt(hexColor.slice(1, 3), 16)
    const green = parseInt(hexColor.slice(3, 5), 16)
    const blue = parseInt(hexColor.slice(5, 7), 16)
    const newRed = Math.min(255, red + amount)
    const newGreen = Math.min(255, green + amount)
    const newBlue = Math.min(255, blue + amount)
    return `#${newRed.toString(16)}${newGreen.toString(16)}${newBlue.toString(16)}`
}
