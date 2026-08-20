import { Feature, Map } from 'ol'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { useEffect } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Geometry, LineString, Point } from 'ol/geom'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Modify } from 'ol/interaction'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint } from '@/actions/Actions'
import { coordinateToText } from '@/Converters'
import { Icon, Stroke, Style } from 'ol/style'
import { createSvg } from '@/layers/createMarkerSVG'

const MARKER_SIZE = 35
export const VIA_MARKER_SIZE = 23

// thin dashed line, used for the access network lines and from the old to the new location while dragging
// markers or the route
export const dashedLineStyle = new Style({
    stroke: new Stroke({
        color: 'rgba(143,183,241,0.9)',
        width: 5,
        lineDash: [1, 10],
        lineCap: 'round',
        lineJoin: 'round',
    }),
})

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
        // hidden while it is dragged along the route, the dragged (numbered) circle replaces it, see UsePathsLayer
        if (feature.get('gh:hidden')) return []
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

function addDragInteractions(map: Map, queryPointsLayer: VectorLayer<VectorSource>) {
    let tmp = queryPointsLayer.getSource()
    if (tmp == null) throw new Error('source must not be null') // typescript requires this
    // the dashed line from the old to the new location while dragging, like when via markers are dragged with
    // the route drag interaction (UsePathsLayer)
    const dragLineStyle = new Style({ stroke: dashedLineStyle.getStroke()! })
    let downPosition: number[] = []
    let dragging = false
    const modify = new Modify({
        hitDetection: queryPointsLayer,
        source: tmp,
        style: feature => {
            if (!dragging) return []
            const position = (feature.getGeometry() as Point).getCoordinates()
            dragLineStyle.setGeometry(new LineString([downPosition, position]))
            return dragLineStyle
        },
        // Via markers are dragged with the route drag interaction instead, which bends the route like when
        // creating a new via point (see UsePathsLayer). Only when no (drag-able) route is shown, e.g. because
        // the request failed, this interaction drags via markers as a fallback.
        condition: e => {
            const routeDrag = map
                .getInteractions()
                .getArray()
                .some(i => i.get('gh:drag_path_interaction'))
            if (!routeDrag) return true
            const feature = map.forEachFeatureAtPixel(e.pixel, f => f, {
                layerFilter: l => l.get('gh:query_points'),
                hitTolerance: 2,
            })
            return feature?.get('gh:marker_props')?.number === undefined
        },
    })
    modify.on('modifystart', e => {
        dragging = true
        const point = e.features.getArray()[0].get('gh:query_point')
        downPosition = fromLonLat([point.coordinate.lng, point.coordinate.lat])
        // for via circles (no-route fallback) the cursor is hidden like when dragging the route
        const isVia = e.features.getArray().some(f => f.get('gh:marker_props')?.number !== undefined)
        map.getViewport().style.cursor = isVia ? 'none' : 'grabbing'
        e.features.getArray().forEach(f => f.set('gh:dragging', true))
    })
    modify.on('modifyend', e => {
        dragging = false
        map.getViewport().style.cursor = 'default'
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
