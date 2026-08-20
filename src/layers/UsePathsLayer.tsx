import { Feature, Map } from 'ol'
import { unByKey } from 'ol/Observable'
import { Path } from '@/api/graphhopper'
import { useEffect } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Icon, Stroke, Style } from 'ol/style'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Modify, Select } from 'ol/interaction'
import { click } from 'ol/events/condition'
import Dispatcher from '@/stores/Dispatcher'
import { AddPoint, SetPoint, SetSelectedPath } from '@/actions/Actions'
import { coordinateToText } from '@/Converters'
import { SelectEvent } from 'ol/interaction/Select'
import QueryStore, { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { distance } from 'ol/coordinate'
import LineString from 'ol/geom/LineString'
import { createCircle } from '@/layers/createMarkerSVG'
import { dashedLineStroke, markerFeatureAtPixel, VIA_MARKER_SIZE } from '@/layers/UseQueryPointsLayer'
import { findNextWayPoint } from '@/map/findNextWayPoint'
import Point from 'ol/geom/Point'

const pathsLayerKey = 'pathsLayer'
const selectedPathLayerKey = 'selectedPathLayer'
const accessNetworkLayerKey = 'accessNetworkLayer'
// set on a click's browser event when that click adds a via point, so e.g. the ContextMenu ignores the click
export const viaPointClickKey = 'gh:via_point_click'

export default function usePathsLayer(
    map: Map,
    paths: Path[],
    selectedPath: Path,
    queryPoints: QueryPoint[],
    showPaths: boolean = true,
) {
    useEffect(() => {
        removeCurrentPathLayers(map)
        removeRouteDragInteractions(map)
        if (showPaths) {
            addUnselectedPathsLayer(
                map,
                paths.filter(p => p != selectedPath),
            )
            addSelectedPathsLayer(map, selectedPath)
            addAccessNetworkLayer(map, selectedPath, queryPoints)
            addRouteDragInteraction(map, selectedPath, queryPoints)
        }
        return () => {
            removeCurrentPathLayers(map)
            removeRouteDragInteractions(map)
        }
    }, [map, paths, selectedPath, showPaths, queryPoints])
}

function removeCurrentPathLayers(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(pathsLayerKey) || l.get(selectedPathLayerKey) || l.get(accessNetworkLayerKey))
        .forEach(l => map.removeLayer(l))
}

function addUnselectedPathsLayer(map: Map, paths: Path[]) {
    const styleArray = [
        new Style({
            stroke: new Stroke({
                color: 'rgba(39,93,173,0.8)',
                width: 6,
            }),
        }),
        new Style({
            stroke: new Stroke({
                color: 'rgba(201,217,241,0.7)',
                width: 4,
            }),
        }),
    ]
    const layer = new VectorLayer({
        source: new VectorSource({
            features: paths.map((path: Path, index) => {
                const f = new Feature({
                    index: index,
                })
                if (path.points?.coordinates)
                    f.setGeometry(new LineString(path.points.coordinates.map(c => fromLonLat(c))))
                return f
            }),
        }),
        style: styleArray,
        opacity: 0.7,
        zIndex: 1,
    })
    layer.set(pathsLayerKey, true)
    map.addLayer(layer)

    // select an alternative path if clicked
    removeSelectPathInteractions(map)
    const select = new Select({
        condition: click,
        layers: [layer],
        style: null,
        hitTolerance: 5,
    })
    select.on('select', (e: SelectEvent) => {
        const index = e.selected[0].getProperties().index
        Dispatcher.dispatch(new SetSelectedPath(paths[index]))
    })
    select.set('gh:select_path_interaction', true)
    map.addInteraction(select)
}

function createBezierLineString(start: number[], end: number[]): LineString {
    const bezierPoints = []
    const center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
    const radius = distance(start, end) / 2

    const startAngle = Math.atan2(start[1] - center[1], start[0] - center[0])
    const endAngle = Math.atan2(end[1] - center[1], end[0] - center[0])

    // Define the control points for the Bezier curve
    const controlPoints = [
        center[0] + (1 / 2) * radius * Math.sin(startAngle + (1 / 2) * (endAngle - startAngle)),
        center[1] + (1 / 2) * radius * Math.cos(startAngle + (1 / 2) * (endAngle - startAngle)),
    ]

    // Calculate intermediate points along the curve using a Bezier curve
    bezierPoints.push(start)
    for (let t = 0; t <= 1; t += 0.1) {
        const point = [
            (1 - t) * (1 - t) * start[0] + 2 * t * (1 - t) * controlPoints[0] + t * t * end[0],
            (1 - t) * (1 - t) * start[1] + 2 * t * (1 - t) * controlPoints[1] + t * t * end[1],
        ]
        bezierPoints.push(point)
    }
    bezierPoints.push(end)
    return new LineString(bezierPoints)
}

function addAccessNetworkLayer(map: Map, selectedPath: Path, queryPoints: QueryPoint[]) {
    const layer = new VectorLayer({
        source: new VectorSource(),
    })
    layer.setStyle(new Style({ stroke: dashedLineStroke }))
    for (let i = 0; i < selectedPath.snapped_waypoints.coordinates.length; i++) {
        if (i >= queryPoints.length) break // can happen if deleted too fast
        const start = fromLonLat([queryPoints[i].coordinate.lng, queryPoints[i].coordinate.lat])
        const end = fromLonLat(selectedPath.snapped_waypoints.coordinates[i])
        layer.getSource()?.addFeature(new Feature(createBezierLineString(start, end)))
    }
    layer.set(accessNetworkLayerKey, true)
    layer.setZIndex(1)
    map.addLayer(layer)
}

const selectedPathStyle = [
    new Style({
        stroke: new Stroke({
            color: 'rgba(255,255,255,0.9)',
            width: 10,
        }),
    }),
    new Style({
        stroke: new Stroke({
            color: 'rgba(39,100,200,0.85)',
            width: 8,
        }),
    }),
]

function addSelectedPathsLayer(map: Map, selectedPath: Path) {
    const layer = new VectorLayer({
        source: new VectorSource({
            features: [new Feature(new LineString(selectedPath.points.coordinates.map(c => fromLonLat(c))))],
        }),
        style: selectedPathStyle,
        opacity: 0.8,
        zIndex: 2,
    })
    layer.set(selectedPathLayerKey, true)
    map.addLayer(layer)
}

/**
 * Pointing at the selected route pops up a via circle that can be dragged to create a new via point there, and
 * dragging a via marker moves it. This uses the Modify interaction which finds the closest segment with a
 * spatial index, i.e. hovering stays cheap even for long routes. It works on an invisible copy of the route so
 * that the displayed route keeps its style — while dragging, only a dashed line from the old to the new
 * location is shown.
 */
function addRouteDragInteraction(map: Map, selectedPath: Path, queryPoints: QueryPoint[]) {
    if (selectedPath.points.coordinates.length < 2 || selectedPath.snapped_waypoints.coordinates.length < 2) return
    // on pointer down Modify inserts a vertex into this invisible copy to have something to drag — harmless,
    // it lies exactly on the line and does not become a via point
    const routeLine = new LineString(selectedPath.points.coordinates.map(c => fromLonLat(c)))
    const source: VectorSource = new VectorSource({
        features: [new Feature(routeLine)],
    })
    // add the via points too, as Modify only starts close to the route and could not grab a marker
    // that is far away from it (large snapping distance)
    queryPoints
        .filter(p => p.isInitialized && p.type === QueryPointType.Via)
        .forEach(p => source.addFeature(new Feature(new Point(fromLonLat([p.coordinate.lng, p.coordinate.lat])))))
    // The query point marker at the given pixel, if any. From/to markers are dragged with their own
    // interaction (see UseBackgroundLayer+UseQueryPointsLayer), via markers with THIS one, so moving
    // them bends the route just like dragging the route itself.
    const markerFeatureAt = (pixel: number[]) => markerFeatureAtPixel(map, pixel, 2)
    // the transparent via circle, with the number of the dragged via marker (or none when creating a new one)
    const circleStyle = (number?: number) =>
        new Style({
            image: new Icon({
                src:
                    'data:image/svg+xml;utf8,' +
                    createCircle({
                        color: QueryStore.getMarkerColor(QueryPointType.Via),
                        number,
                        size: VIA_MARKER_SIZE,
                    }),
                opacity: 0.5,
            }),
        })
    const style = circleStyle()
    let dragStyle = style
    // the dashed line from the old to the new location while dragging
    const dragLineStyle = new Style({ stroke: dashedLineStroke })
    let dragging = false
    const modify = new Modify({
        source: source,
        style: feature => {
            const position = (feature.getGeometry() as Point).getCoordinates()
            if (dragging) {
                dragLineStyle.setGeometry(new LineString([downPosition, position]))
                return [dragStyle, dragLineStyle]
            }
            return !markerFeatureAt(map.getPixelFromCoordinate(position)) ? style : []
        },
        condition: e => {
            const feature = markerFeatureAt(e.pixel)
            return feature === undefined || feature.get('gh:query_point')?.type === QueryPointType.Via
        },
    })
    let downPixel = [0, 0]
    let downPosition: number[] = []
    let downCoordinate = { lng: 0, lat: 0 }
    let grabbedViaFeature: Feature | undefined = undefined
    modify.on('modifystart', e => {
        dragging = true
        downPixel = e.mapBrowserEvent.pixel
        downPosition = e.mapBrowserEvent.coordinate
        const lonLat = toLonLat(e.mapBrowserEvent.coordinate)
        downCoordinate = { lng: lonLat[0], lat: lonLat[1] }
        // due to the condition above this can only be a via marker: hide it, the dragged (numbered)
        // circle replaces it and the dashed line starts at its exact old location
        grabbedViaFeature = markerFeatureAt(downPixel)
        grabbedViaFeature?.set('gh:hidden', true)
        if (grabbedViaFeature) downPosition = (grabbedViaFeature.getGeometry() as Point).getCoordinates()
        const number = grabbedViaFeature?.get('gh:marker_props')?.number
        dragStyle = number === undefined ? style : circleStyle(number)
        // hide the cursor while dragging for more precise placement, like for via circles
        map.getViewport().style.cursor = 'none'
    })
    modify.on('modifyend', e => {
        dragging = false
        map.getViewport().style.cursor = 'default'
        const grabbedViaPoint = grabbedViaFeature?.get('gh:query_point')
        grabbedViaFeature?.set('gh:hidden', false)
        grabbedViaFeature = undefined
        const pixel = e.mapBrowserEvent.pixel
        // clicks are handled below, a drag creates or moves a via point
        if (Math.abs(pixel[0] - downPixel[0]) <= 2 && Math.abs(pixel[1] - downPixel[1]) <= 2) return
        const lonLat = toLonLat(e.mapBrowserEvent.coordinate)
        const coordinate = { lng: lonLat[0], lat: lonLat[1] }
        if (grabbedViaPoint) {
            // the drag started on a via marker -> move it
            Dispatcher.dispatch(
                new SetPoint({ ...grabbedViaPoint, coordinate, queryText: coordinateToText(coordinate) }, false),
            )
            return
        }
        addViaPoint(coordinate, downCoordinate)
    })
    // inserts a new via point, into the route leg closest to `near`: for a drag this must be where it
    // started — the drop position could be closer to another leg
    const addViaPoint = (coordinate: { lng: number; lat: number }, near: { lng: number; lat: number }) => {
        const route = {
            coordinates: selectedPath.points.coordinates.map(c => ({ lng: c[0], lat: c[1] })),
            wayPoints: selectedPath.snapped_waypoints.coordinates.map(c => ({ lng: c[0], lat: c[1] })),
        }
        const index = findNextWayPoint([route], near).nextWayPoint
        Dispatcher.dispatch(new AddPoint(index, coordinate, true, false))
    }
    // A click on the route adds a via point exactly on it. It is evaluated on 'click' (fired on pointer up,
    // i.e. not after panning or dragging) but only added on the matching 'singleclick' (same originalEvent),
    // which OpenLayers does not fire for a double click (zoom). Where an alternative route overlaps the
    // selected one the via point wins: the click is consumed with stopPropagation before the Select
    // interaction could switch routes.
    const clickKey = map.on('click', e => {
        // markers handle clicks themselves (context menu)
        if (markerFeatureAt(e.pixel)) return
        const closest = routeLine.getClosestPoint(e.coordinate)
        const closestPixel = map.getPixelFromCoordinate(closest)
        // same distance to the route within which the hover circle is shown (Modify's pixel tolerance)
        if (Math.hypot(closestPixel[0] - e.pixel[0], closestPixel[1] - e.pixel[1]) > 10) return
        e.stopPropagation()
        const lonLat = toLonLat(closest)
        const clickLonLat = toLonLat(e.coordinate)
        // also tells the ContextMenu to not open on the new marker
        ;(e.originalEvent as any)[viaPointClickKey] = {
            coordinate: { lng: lonLat[0], lat: lonLat[1] },
            near: { lng: clickLonLat[0], lat: clickLonLat[1] },
        }
    })
    const singleClickKey = map.on('singleclick', e => {
        const viaPointClick = (e.originalEvent as any)[viaPointClickKey]
        if (viaPointClick) addViaPoint(viaPointClick.coordinate, viaPointClick.near)
    })
    modify.set('gh:drag_path_interaction', true)
    modify.set('gh:route_click_keys', [clickKey, singleClickKey])
    map.addInteraction(modify)
}

function removeRouteDragInteractions(map: Map) {
    map.getInteractions()
        .getArray()
        .filter(i => i.get('gh:drag_path_interaction'))
        .forEach(i => {
            unByKey(i.get('gh:route_click_keys'))
            map.removeInteraction(i)
        })
}

function removeSelectPathInteractions(map: Map) {
    map.getInteractions()
        .getArray()
        .filter(i => i.get('gh:select_path_interaction'))
        .forEach(i => map.removeInteraction(i))
}
