import { Feature, Map } from 'ol'
import { useEffect } from 'react'
import { RasterStyle, StyleOption } from '@/stores/MapOptionsStore'
import TileLayer from 'ol/layer/Tile'
import ImageTile from 'ol/ImageTile'
import { XYZ } from 'ol/source'

export default function useBackgroundLayer(map: Map, styleOption: StyleOption) {
    useEffect(() => {
        let cancelled = false
        removeCurrentBackgroundLayers(map)
        addNewBackgroundLayers(map, styleOption, () => cancelled)
        return () => {
            cancelled = true
            removeCurrentBackgroundLayers(map)
        }
    }, [map, styleOption])

    // Pointer cursor over interactive features — registered once, independent of style changes
    useEffect(() => {
        const onPointerMove = (evt: any) => {
            if (evt.dragging) return // skip expensive hit-test while panning
            let cursor = 'default'
            map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
                if (!(feature instanceof Feature)) return
                // query point markers can be dragged -> hand cursor, other features are just clickable
                cursor = layer?.get('gh:query_points') ? 'grab' : 'pointer'
                return true // stop at the topmost feature
            })
            map.getTargetElement().style.cursor = cursor
        }
        map.on('pointermove', onPointerMove)
        return () => {
            map.un('pointermove', onPointerMove)
        }
    }, [map])
}

function removeCurrentBackgroundLayers(map: Map) {
    const backgroundLayers = map
        .getLayers()
        .getArray()
        .filter(l => {
            // vector layers added via olms#addLayers have the mapbox-source key
            return l.get('mapbox-source') || l.get('background-maplibre-layer') || l.get('background-raster-layer')
        })
    backgroundLayers.forEach(l => {
        map.removeLayer(l)
        // removing a layer does not dispose it, but otherwise switching styles leaks the WebGL context
        if (l.get('background-maplibre-layer')) l.dispose()
    })
}

function addNewBackgroundLayers(map: Map, styleOption: StyleOption, isCancelled: () => boolean) {
    if (styleOption.type === 'vector') {
        // MapLibre renders vector tiles with WebGL and so is much faster than the vector tile support of OpenLayers.
        // It is loaded lazily because it is only needed for vector styles and it is a rather big dependency.
        import('@/layers/MapLibreLayer').then(({ default: MapLibreLayer }) => {
            if (isCancelled()) return
            const vectorLayer = new MapLibreLayer(styleOption.url as string, styleOption.attribution)
            vectorLayer.set('background-maplibre-layer', true)
            map.addLayer(vectorLayer)
        })
    } else {
        const rasterStyle = styleOption as RasterStyle
        const tileLayer = new TileLayer({
            source: new XYZ({
                urls: rasterStyle.url,
                maxZoom: rasterStyle.maxZoom,
                attributions: [rasterStyle.attribution],
                tilePixelRatio: rasterStyle.tilePixelRatio,
                tileLoadFunction: (tile, src) => {
                    const img = (tile as ImageTile).getImage() as HTMLImageElement
                    img.referrerPolicy = 'strict-origin-when-cross-origin'
                    img.src = src
                },
            }),
        })
        tileLayer.set('background-raster-layer', true)
        map.addLayer(tileLayer)
    }
}
