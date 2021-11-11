import { Feature, Map } from 'ol'
import { QueryPoint } from '@/stores/QueryStore'
import React from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Point } from 'ol/geom'
import { fromLonLat } from 'ol/proj'

interface QueryPointsLayerProps {
    map: Map
    queryPoints: QueryPoint[]
}

export default function ({ map, queryPoints }: QueryPointsLayerProps) {
    map.getLayers()
        .getArray()
        .filter(l => l.get('gh:query_points'))
        .forEach(l => map.removeLayer(l))

    const features = queryPoints
        .map((point, i) => {
            return { index: i, point: point }
        })
        .filter(indexPoint => indexPoint.point.isInitialized)
        .map((indexPoint, i) => {
            const feature = new Feature({
                geometry: new Point(fromLonLat([indexPoint.point.coordinate.lng, indexPoint.point.coordinate.lat])),
            })
            // todo: use svg markers, set style, make draggable
            return feature
        })
    const queryPointsLayer = new VectorLayer({
        source: new VectorSource({
            features: features,
        }),
    })
    queryPointsLayer.set('gh:query_points', true)
    queryPointsLayer.setZIndex(1)
    map.addLayer(queryPointsLayer)
    return null
}
