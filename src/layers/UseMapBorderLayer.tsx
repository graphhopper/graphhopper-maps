import { Map } from 'ol'
import { Bbox } from '@/api/graphhopper'
import { useEffect } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { GeoJSON } from 'ol/format'
import { Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'

const borderLayerKey = 'borderLayer'

export default function useMapBorderLayer(map: Map, bbox: Bbox) {
    useEffect(() => {
        removeBorderLayer(map)
        if (JSON.stringify(bbox) !== '[-180,-90,180,90]') addBorderLayer(map, bbox)
        return () => {
            removeBorderLayer(map)
        }
    }, [map, bbox])
}

function addBorderLayer(map: Map, bbox: Bbox) {
    const layer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [bbox[0], bbox[1]],
                        [bbox[0], bbox[3]],
                        [bbox[2], bbox[3]],
                        [bbox[2], bbox[1]],
                        [bbox[0], bbox[1]],
                    ].map(c => fromLonLat(c)),
                },
            }),
        }),
        style: new Style({
            stroke: new Stroke({
                color: '#AAAAAA',
                width: 2,
            }),
        }),
    })
    layer.set(borderLayerKey, true)
    layer.setZIndex(0.1)
    map.addLayer(layer)
}

function removeBorderLayer(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(borderLayerKey))
        .forEach(l => map.removeLayer(l))
}
