import {Feature, Map} from 'ol'
import { Path } from '@/api/graphhopper'
import { FeatureCollection } from 'geojson'
import { useEffect } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { GeoJSON } from 'ol/format'
import { Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { Select } from 'ol/interaction'
import { click } from 'ol/events/condition'
import Dispatcher from '@/stores/Dispatcher'
import { SetSelectedPath } from '@/actions/Actions'
import { SelectEvent } from 'ol/interaction/Select'
import {QueryPoint} from "@/stores/QueryStore";
import {Coordinate, distance} from "ol/coordinate";
import LineString from "ol/geom/LineString";

const pathsLayerKey = 'pathsLayer'
const selectedPathLayerKey = 'selectedPathLayer'
const accessNetworkLayerKey = 'accessNetworkLayer'

export default function usePathsLayer(map: Map, paths: Path[], selectedPath: Path, queryPoints: QueryPoint[]) {
    useEffect(() => {
        removeCurrentPathLayers(map)
        addUnselectedPathsLayer(
            map,
            paths.filter(p => p != selectedPath)
        )
        addSelectedPathsLayer(map, selectedPath)
        addAccessNetworkLayer(map, selectedPath, queryPoints)
        return () => {
            removeCurrentPathLayers(map)
        }
    }, [map, paths, selectedPath])
}

function removeCurrentPathLayers(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(pathsLayerKey) || l.get(selectedPathLayerKey) || l.get(accessNetworkLayerKey))
        .forEach(l => map.removeLayer(l))
}

function addUnselectedPathsLayer(map: Map, paths: Path[]) {
    const style = new Style({
        stroke: new Stroke({
            color: '#5B616A',
            width: 5,
            lineCap: 'round',
            lineJoin: 'round',
        }),
    })
    const layer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(createUnselectedPaths(paths)),
        }),
        style: () => style,
        opacity: 0.8,
    })
    layer.set(pathsLayerKey, true)
    layer.setZIndex(1)
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

function createBezierLineString(start: number[], end: number[]):LineString {
    var curvePoints = [];
    var center = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    var radius = distance(start, end) / 2;

    var startAngle = Math.atan2(start[1] - center[1], start[0] - center[0]);
    var endAngle = Math.atan2(end[1] - center[1], end[0] - center[0]);

    // Define the control points for the Bezier curve
    var controlPoints = [
        center[0] + 1/2 * radius * Math.sin(startAngle + 1/2 * (endAngle - startAngle)),
        center[1] + 1/2 * radius * Math.cos(startAngle + 1/2 * (endAngle - startAngle))
    ];

    // Calculate intermediate points along the curve using a Bezier curve
    curvePoints.push(start);
    for (var t = 0; t <= 1; t += 0.1) {
        var point = [
            (1-t)*(1-t)*start[0] + 2*t*(1-t)*controlPoints[0] + t*t*end[0],
            (1-t)*(1-t)*start[1] + 2*t*(1-t)*controlPoints[1] + t*t*end[1]
        ];
        curvePoints.push(point);
    }
    curvePoints.push(end)
    return new LineString(curvePoints);
}

function addAccessNetworkLayer(map: Map, selectedPath: Path, queryPoints: QueryPoint[]) {
    const style = new Style({
        stroke: new Stroke({
            // color: 'rgba(170,170,170,1)',
            color: '#275DAD',
            width: 4,
            lineDash: [1, 10],
            lineCap: 'round',
            lineJoin: 'round'
        }),
    })
    var layer = new VectorLayer({
        source: new VectorSource()
    });
    layer.setStyle(style);
    for(let i=0;i<selectedPath.snapped_waypoints.coordinates.length;i++){
        let start = fromLonLat([queryPoints[i].coordinate.lng,queryPoints[i].coordinate.lat]);
        let end = fromLonLat(selectedPath.snapped_waypoints.coordinates[i]);
        layer.getSource()?.addFeature(new Feature(createBezierLineString(start,end)))
    }
    layer.set(accessNetworkLayerKey, true)
    layer.setZIndex(1)
    map.addLayer(layer)
}

function addSelectedPathsLayer(map: Map, selectedPath: Path) {
    const style = new Style({
        stroke: new Stroke({
            color: '#275DAD',
            width: 6,
            lineCap: 'round',
            lineJoin: 'round',
        }),
    })
    const layer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(createSelectedPath(selectedPath)),
        }),
        style: () => style,
        opacity: 0.8,
    })
    layer.set(selectedPathLayerKey, true)
    layer.setZIndex(2)
    map.addLayer(layer)
}

function createUnselectedPaths(paths: Path[]) {
    const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: paths.map((path, index) => {
            return {
                type: 'Feature',
                properties: {
                    index,
                },
                geometry: {
                    ...path.points,
                    coordinates: path.points.coordinates.map(c => fromLonLat(c)),
                },
            }
        }),
    }
    return featureCollection
}

function createSelectedPath(path: Path) {
    const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {},
                geometry: {
                    ...path.points,
                    coordinates: path.points.coordinates.map(c => fromLonLat(c)),
                },
            },
        ],
    }
    return featureCollection
}

function removeSelectPathInteractions(map: Map) {
    map.getInteractions()
        .getArray()
        .filter(i => i.get('gh:select_path_interaction'))
        .forEach(i => map.removeInteraction(i))
}
