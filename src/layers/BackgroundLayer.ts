import { Map } from 'ol'
import { useEffect } from 'react'
import { Group } from 'ol/layer'
import { RasterStyle, StyleOption } from '@/stores/MapOptionsStore'
import TileLayer from 'ol/layer/Tile'
import { XYZ } from 'ol/source'
import addLayers from 'ol-mapbox-style'

interface BackgroundLayerProps {
    map: Map
    styleOption: StyleOption
}

export default function ({ map, styleOption }: BackgroundLayerProps) {
    useEffect(() => {
        removeBackgroundLayers(map)
        if (styleOption.type === 'vector') {
            addLayers(map, styleOption.url)
        } else {
            const rasterStyle = styleOption as RasterStyle
            const tileLayer = new TileLayer({
                source: new XYZ({
                    urls: rasterStyle.url,
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
