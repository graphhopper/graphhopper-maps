import { Feature, Map } from 'ol'
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
import { TurnNavigationStoreState } from '@/stores/TurnNavigationStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { Geometry, LineString, Point } from 'ol/geom'

const pathsLayerKey = 'pathsLayer'
const selectedPathLayerKey = 'selectedPathLayer'

export default function usePathsLayer(map: Map, route: RouteStoreState, turnNavigation: TurnNavigationStoreState) {
    useEffect(() => {
        removeCurrentPathLayers(map)
        if (turnNavigation.showUI && turnNavigation.activePath != null) {
            addSelectedPathsLayer(map, turnNavigation.activePath, turnNavigation)
        } else {
            addUnselectedPathsLayer(
                map,
                route.routingResult.paths.filter(p => p != route.selectedPath)
            )
            addSelectedPathsLayer(map, route.selectedPath, turnNavigation)
        }
        return () => {
            removeCurrentPathLayers(map)
        }
    }, [map, route.routingResult.paths, route.selectedPath, turnNavigation.showUI, turnNavigation.activePath])
}

function removeCurrentPathLayers(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(pathsLayerKey) || l.get(selectedPathLayerKey))
        .forEach(l => map.removeLayer(l))
}

function addUnselectedPathsLayer(map: Map, paths: Path[]) {
    const layer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(createUnselectedPaths(paths)),
        }),
        style: () =>
            new Style({
                stroke: new Stroke({
                    color: '#5B616A',
                    width: 5,
                    lineCap: 'round',
                    lineJoin: 'round',
                }),
            }),
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

function addSelectedPathsLayer(map: Map, selectedPath: Path, turnNavigation: TurnNavigationStoreState) {
    const styles = {
        LineString: new Style({
            stroke: new Stroke({
                color: '#275DAD',
                width: 6,
                lineCap: 'round',
                lineJoin: 'round',
            }),
        })
    } as { [key: string]: Style }
    const features = [
        new Feature({
            properties: { type: 'LineString' },
            geometry: new LineString(selectedPath.points.coordinates.map(c => fromLonLat(c))),
        }),
    ] as Feature[]
    const coord = turnNavigation.coordinate
    if (coord != null) features.push(new Feature({ geometry: new Point(fromLonLat([coord.lng, coord.lat])) }))

    const layer = new VectorLayer({
        source: new VectorSource({ features: features }),
        style: feature => styles[(feature.getGeometry() as Geometry).getType()],
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

function removeSelectPathInteractions(map: Map) {
    map.getInteractions()
        .getArray()
        .filter(i => i.get('gh:select_path_interaction'))
        .forEach(i => map.removeInteraction(i))
}
