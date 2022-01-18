import { Feature, Map } from 'ol'
import { useEffect } from 'react'
import { RasterStyle, StyleOption } from '@/stores/MapOptionsStore'
import TileLayer from 'ol/layer/Tile'
import { XYZ } from 'ol/source'
import addLayers from 'ol-mapbox-style'

interface BackgroundLayerProps {
    map: Map
    styleOption: StyleOption
}

export default function BackgroundLayer({ map, styleOption }: BackgroundLayerProps) {
    // todo: do we need useEffect (to remove the layers) here? and do we even need to treat the layers as react components?
    //       all they really do is attach some things to the map... and they do not correspond to any DOM elements either
    useEffect(() => {
        removeBackgroundLayers(map)
        if (styleOption.type === 'vector') {
            addLayers(map, styleOption.url)
        } else {
            const rasterStyle = styleOption as RasterStyle
            const tileLayer = new TileLayer({
                source: new XYZ({
                    urls: rasterStyle.url,
                    maxZoom: rasterStyle.maxZoom,
                    attributions: [rasterStyle.attribution],
                    tilePixelRatio: rasterStyle.tilePixelRatio,
                }),
            })
            tileLayer.set('background-raster-layer', true)
            map.addLayer(tileLayer)
        }
        map.on('pointermove', function (evt) {
            const features = map.getFeaturesAtPixel(evt.pixel)
            // features can also contain 'RenderFeatures' for vector tiles, but in this case the cursor should not change
            const atFeature = features.some(f => f instanceof Feature)
            map.getTargetElement().style.cursor = atFeature ? 'pointer' : 'grab'
        })
        return () => {
            removeBackgroundLayers(map)
        }
    }, [map, styleOption])

    return null
}

function removeBackgroundLayers(map: Map) {
    const backgroundLayers = map
        .getLayers()
        .getArray()
        .filter(l => {
            // vector layers added via olms#addLayers have the mapbox-source key
            return l.get('mapbox-source') || l.get('background-raster-layer')
        })
    backgroundLayers.forEach(l => map.removeLayer(l))
}
