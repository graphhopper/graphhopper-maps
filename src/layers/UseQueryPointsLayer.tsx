import { Feature, Map } from 'ol'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { useEffect } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Geometry, Point } from 'ol/geom'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Modify } from 'ol/interaction'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint } from '@/actions/Actions'
import { coordinateToText } from '@/Converters'
import { Icon, Style } from 'ol/style'
import { createSvg } from '@/layers/createMarkerSVG'

const MARKER_SIZE = 35
const VIA_MARKER_SIZE = 23

export default function useQueryPointsLayer(map: Map, queryPoints: QueryPoint[]) {
    useEffect(() => {
        removeQueryPoints(map)
        const queryPointsLayer = addQueryPointsLayer(map, queryPoints)
        removeDragInteractions(map)
        addDragInteractions(map, queryPointsLayer)
        return () => {
            removeQueryPoints(map)
            removeDragInteractions(map)
        }
    }, [map, queryPoints])
}

function removeQueryPoints(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get('gh:query_points'))
        .forEach(l => map.removeLayer(l))
}

function addQueryPointsLayer(map: Map, queryPoints: QueryPoint[]) {
    const features: Feature<Geometry>[] = queryPoints
        .filter(point => point.isInitialized)
        .map((point, i) => {
            const feature = new Feature({
                geometry: new Point(fromLonLat([point.coordinate.lng, point.coordinate.lat])),
            })
            const isVia = point.type == QueryPointType.Via
            feature.set('gh:query_point', point)
            feature.set('gh:marker_props', {
                color: point.color,
                // a number is only displayed for via points and turns the marker into a circle
                number: isVia ? i : undefined,
                size: isVia ? VIA_MARKER_SIZE : MARKER_SIZE,
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
    const cachedStyles: { [id: string]: Style } = {}
    queryPointsLayer.setStyle(feature => {
        const props = feature.get('gh:marker_props')
        const key = props.number + '-' + props.color + '-' + props.size
        let style = cachedStyles[key]
        if (style) return style
        style = new Style({
            image: new Icon({
                src: 'data:image/svg+xml;utf8,' + createSvg(props),
                // the via circle is centered on the coordinate, the marker points to it with its tip
                displacement: props.number !== undefined ? [0, 0] : [0, MARKER_SIZE / 2],
            }),
        })
        cachedStyles[key] = style
        return style
    })
    map.addLayer(queryPointsLayer)
    return queryPointsLayer
}

function removeDragInteractions(map: Map) {
    map.getInteractions()
        .getArray()
        .filter(l => l.get('gh:drag_query_point'))
        .forEach(i => map.removeInteraction(i))
}

function addDragInteractions(map: Map, queryPointsLayer: VectorLayer<VectorSource>) {
    let tmp = queryPointsLayer.getSource()
    if (tmp == null) throw new Error('source must not be null') // typescript requires this
    const modify = new Modify({
        hitDetection: queryPointsLayer,
        source: tmp,
        style: [],
    })
    modify.on('modifystart', e => {
        map.getViewport().style.cursor = 'grabbing'
    })
    modify.on('modifyend', e => {
        map.getViewport().style.cursor = 'default'
        const feature = (e as any).features.getArray()[0]
        const point = feature.get('gh:query_point')
        const coordinateLonLat = toLonLat(feature.getGeometry().getCoordinates())
        const coordinate = { lng: coordinateLonLat[0], lat: coordinateLonLat[1] }
        Dispatcher.dispatch(
            new SetPoint(
                {
                    ...point,
                    coordinate,
                    queryText: coordinateToText(coordinate),
                },
                false,
            ),
        )
    })
    modify.set('gh:drag_query_point', true)
    map.addInteraction(modify)
}
