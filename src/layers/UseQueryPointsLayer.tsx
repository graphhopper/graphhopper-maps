import { Feature, Map } from 'ol'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import React, { useEffect } from 'react'
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

const MARKER_SIZE = 35

export default function useQueryPointsLayer(map: Map, queryPoints: QueryPoint[]) {
    useEffect(() => {
        removeQueryPoints(map)
        const queryPointsLayer = addQueryPointsLayer(map, queryPoints)
        removeDragInteractions(map)
        addDragInteractions(map, queryPointsLayer)
    }, [map, queryPoints])
}

function removeQueryPoints(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get('gh:query_points'))
        .forEach(l => map.removeLayer(l))
}

function addQueryPointsLayer(map: Map, queryPoints: QueryPoint[]) {
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
                size: MARKER_SIZE,
            })
            return feature
        })
    const queryPointsLayer = new VectorLayer({
        source: new VectorSource({
            features: features,
        }),
    })
    queryPointsLayer.set('gh:query_points', true)
    queryPointsLayer.setZIndex(3)
    queryPointsLayer.setStyle(
        feature =>
            new Style({
                image: new Icon({
                    src: 'data:image/svg+xml;utf8,' + createSvg(feature.get('gh:marker_props')),
                    displacement: [0, MARKER_SIZE / 2],
                }),
            })
    )
    map.addLayer(queryPointsLayer)
    return queryPointsLayer
}

function removeDragInteractions(map: Map) {
    map.getInteractions()
        .getArray()
        .filter(l => l.get('gh:drag_query_point'))
        .forEach(i => map.removeInteraction(i))
}

function addDragInteractions(map: Map, queryPointsLayer: VectorLayer<any>) {
    const modify = new Modify({
        hitDetection: queryPointsLayer,
        source: queryPointsLayer.getSource(),
        style: [],
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
            }, false)
        )
    })
    modify.set('gh:drag_query_point', true)
    map.addInteraction(modify)
}
