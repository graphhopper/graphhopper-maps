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
import { setRouteDraggingStyle, setViaDragLine } from '@/layers/UsePathsLayer'

const MARKER_SIZE = 35
export const VIA_MARKER_SIZE = 23

export default function useQueryPointsLayer(map: Map, queryPoints: QueryPoint[]) {
    useEffect(() => {
        removeQueryPoints(map)
        const queryPointsLayer = addQueryPointsLayer(map, queryPoints)
        removeDragInteractions(map)
        addDragInteractions(map, queryPointsLayer, queryPoints)
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
        const isVia = props.number !== undefined
        // transparent when dragging
        const dragging = isVia && feature.get('gh:dragging') === true
        const key = props.number + '-' + props.color + '-' + props.size + '-' + dragging
        let style = cachedStyles[key]
        if (style) return style
        style = new Style({
            image: new Icon({
                src: 'data:image/svg+xml;utf8,' + createSvg(props),
                // the via circle is centered on the coordinate, the marker points to it with its tip
                displacement: isVia ? [0, 0] : [0, MARKER_SIZE / 2],
                opacity: dragging ? 0.5 : 1,
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

/**
 * While a via marker is dragged, a dashed line connects it with its neighboring query points and follows the
 * dragged marker, like the dragged route line stays connected to the drag-from-route circle (see UsePathsLayer).
 * Returns a function that unbinds the listener and removes the line again.
 */
function bindViaDragLine(map: Map, feature: Feature<Geometry>, queryPoints: QueryPoint[]) {
    const point = feature.get('gh:query_point')
    const index = queryPoints.findIndex(p => p.id === point.id)
    const anchors = [queryPoints[index - 1], queryPoints[index + 1]]
        .filter(p => p && p.isInitialized)
        .map(p => fromLonLat([p.coordinate.lng, p.coordinate.lat]))
    const geometry = feature.getGeometry() as Point
    if (anchors.length === 0) return () => {}
    const update = () => {
        const pos = geometry.getCoordinates()
        setViaDragLine(map, anchors.length === 2 ? [anchors[0], pos, anchors[1]] : [anchors[0], pos])
    }
    geometry.on('change', update)
    update()
    return () => {
        geometry.un('change', update)
        setViaDragLine(map, null)
    }
}

function addDragInteractions(map: Map, queryPointsLayer: VectorLayer<VectorSource>, queryPoints: QueryPoint[]) {
    let tmp = queryPointsLayer.getSource()
    if (tmp == null) throw new Error('source must not be null') // typescript requires this
    const modify = new Modify({
        hitDetection: queryPointsLayer,
        source: tmp,
        style: [],
    })
    let unbindViaDragLine = () => {}
    modify.on('modifystart', e => {
        // for via circles the cursor is hidden, the transparent circle itself indicates the (centered) placement
        const isVia = e.features.getArray().some(f => f.get('gh:marker_props')?.number !== undefined)
        map.getViewport().style.cursor = isVia ? 'none' : 'grabbing'
        // consistent with dragging the route itself to create a new via point, see UsePathsLayer
        if (isVia) {
            setRouteDraggingStyle(map, true)
            unbindViaDragLine = bindViaDragLine(map, e.features.getArray()[0], queryPoints)
        }
        e.features.getArray().forEach(f => f.set('gh:dragging', true))
    })
    modify.on('modifyend', e => {
        map.getViewport().style.cursor = 'default'
        setRouteDraggingStyle(map, false)
        unbindViaDragLine()
        unbindViaDragLine = () => {}
        const feature = (e as any).features.getArray()[0]
        feature.set('gh:dragging', false)
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
