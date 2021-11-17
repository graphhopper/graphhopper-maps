import { Feature, Map } from 'ol'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import React from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Point } from 'ol/geom'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Modify } from 'ol/interaction'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint } from '@/actions/Actions'
import { coordinateToText } from '@/Converters'
import { Icon, Style } from 'ol/style'
import { createSvg } from '@/layers/createMarkerSVG'

interface QueryPointsLayerProps {
    map: Map
    queryPoints: QueryPoint[]
}

export default function QueryPointsLayer({ map, queryPoints }: QueryPointsLayerProps) {
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
            feature.set('gh:query_point', indexPoint.point)
            feature.set('gh:marker_props', {
                color: indexPoint.point.color,
                number: indexPoint.point.type == QueryPointType.Via ? i : undefined,
                size: 35,
            })
            // todo: use svg markers, setStyle()
            return feature
        })
    const queryPointsLayer = new VectorLayer({
        source: new VectorSource({
            features: features,
        }),
    })
    queryPointsLayer.set('gh:query_points', true)
    queryPointsLayer.setZIndex(2)
    queryPointsLayer.setStyle(
        feature =>
            new Style({
                image: new Icon({
                    src: 'data:image/svg+xml;utf8,' + createSvg(feature.get('gh:marker_props')),
                }),
            })
    )
    map.addLayer(queryPointsLayer)

    map.getInteractions()
        .getArray()
        .filter(l => l.get('gh:drag_query_point'))
        .forEach(i => map.removeInteraction(i))

    const modify = new Modify({
        hitDetection: queryPointsLayer,
        source: queryPointsLayer.getSource(),
    })
    modify.on('modifyend', e => {
        const feature = (e as any).features.getArray()[0]
        const point = feature.get('gh:query_point')
        const coordinateLonLat = toLonLat(feature.getGeometry().getCoordinates())
        const coordinate = { lng: coordinateLonLat[0], lat: coordinateLonLat[1] }
        Dispatcher.dispatch(
            new SetPoint({
                ...point,
                coordinate,
                queryText: coordinateToText(coordinate),
            })
        )
    })
    modify.set('gh:drag_query_point', true)
    map.addInteraction(modify)

    return null
}
