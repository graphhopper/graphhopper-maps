import { Map } from 'ol'
import { useEffect } from 'react'
import { RasterStyle, StyleOption } from '@/stores/MapOptionsStore'
import TileLayer from 'ol/layer/Tile'
import { XYZ } from 'ol/source'
import addLayers from 'ol-mapbox-style'

interface BackgroundLayerProps {
    map: Map
    styleOption: StyleOption
}

export default function ({ map, styleOption }: BackgroundLayerProps) {
    // todo: still missing attributions, but also tile size setting etc.
    // todo: do we need useEffect (to remove the layers) here? and do we even need to treat the layers as react components?
    //       all they really do is attach some things to the map... and they do not correspond to any DOM elements
    useEffect(() => {
        removeBackgroundLayers(map)
        if (styleOption.type === 'vector') {
            addLayers(map, styleOption.url)
        } else {
            const rasterStyle = styleOption as RasterStyle
            const tileLayer = new TileLayer({
                source: new XYZ({
                    urls: rasterStyle.url,
                    attributions: [rasterStyle.attribution],
                }),
            })
            tileLayer.set('background-raster-layer', true)
            map.addLayer(tileLayer)
        }
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
