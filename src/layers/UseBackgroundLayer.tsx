import { Feature, Map } from 'ol'
import { useEffect } from 'react'
import { RasterStyle, StyleOption } from '@/stores/MapOptionsStore'
import TileLayer from 'ol/layer/Tile'
import { XYZ } from 'ol/source'
import { apply } from 'ol-mapbox-style'

export default function useBackgroundLayer(map: Map, styleOption: StyleOption) {
    useEffect(() => {
        removeCurrentBackgroundLayers(map)
        addNewBackgroundLayers(map, styleOption)
        setupMouseInteraction(map)
        return () => {
            removeCurrentBackgroundLayers(map)
        }
    }, [map, styleOption])
}

function removeCurrentBackgroundLayers(map: Map) {
    const backgroundLayers = map
        .getLayers()
        .getArray()
        .filter(l => {
            // vector layers added via olms#addLayers have the mapbox-source key
            return l.get('mapbox-source') || l.get('background-raster-layer')
        })
    backgroundLayers.forEach(l => map.removeLayer(l))
}

function addNewBackgroundLayers(map: Map, styleOption: StyleOption) {
    if (styleOption.type === 'vector') {
        // todo: handle promise return value?
        apply(map, styleOption.url)
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
}

function setupMouseInteraction(map: Map) {
    map.on('pointermove', function (evt) {
        const features = map.getFeaturesAtPixel(evt.pixel)
        // features can also contain 'RenderFeatures' for vector tiles, but in this case the cursor should not change
        const atFeature = features.some(f => f instanceof Feature)
        map.getTargetElement().style.cursor = atFeature ? 'pointer' : 'default'
    })
}
