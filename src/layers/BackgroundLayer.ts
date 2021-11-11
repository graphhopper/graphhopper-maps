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
            map.addLayer(
                new TileLayer({
                    source: new XYZ({
                        urls: rasterStyle.url,
                    }),
                })
            )
        }
        return () => {
            removeBackgroundLayers(map)
        }
    }, [map, styleOption])

    return null
}

function removeBackgroundLayers(map: Map) {
    // remove all layers (map.getLayers(l => map.removeLayer(l)) is not ok because it modifies the collection that is being iterated)
    map.setLayerGroup(new Group())
}
