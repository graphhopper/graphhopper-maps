import { Map } from 'ol'
import { Path } from '@/api/graphhopper'
import { FeatureCollection } from 'geojson'
import React from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { GeoJSON } from 'ol/format'
import { Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'
import { Select } from 'ol/interaction'
import { click } from 'ol/events/condition'
import Dispatcher from '@/stores/Dispatcher'
import { SetSelectedPath } from '@/actions/Actions'

const pathsLayerKey = 'pathsLayer'
const selectedPathLayerKey = 'selectedPathLayer'

interface PathsLayerProps {
    map: Map
    selectedPath: Path
    paths: Path[]
}

export default function PathsLayer({ map, selectedPath, paths }: PathsLayerProps) {
    // todo: do not remove paths if only the *selected* path has changed?! in master the paths do not disappear when
    // another one is selected
    removePathLayers(map)

    const currentPaths = paths
        .map((path, i) => {
            return {
                path,
                index: i,
            }
        })
        .filter(indexPath => indexPath.path !== selectedPath)
    const pathsLayer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(createUnselectedPaths(currentPaths)),
        }),
        style: () =>
            new Style({
                stroke: new Stroke({
                    color: '#5B616A',
                    width: 6,
                    lineCap: 'round',
                    lineJoin: 'round',
                }),
            }),
        opacity: 0.8,
    })
    pathsLayer.set(pathsLayerKey, true)
    pathsLayer.setZIndex(1)
    map.addLayer(pathsLayer)

    // allow click-selection of alternative paths
    map.getInteractions()
        .getArray()
        .filter(i => i.get('gh:select_path_interaction'))
        .forEach(i => map.removeInteraction(i))
    const select = new Select({
        condition: click,
        layers: [pathsLayer],
        style: null,
        hitTolerance: 5,
    })
    select.on('select', e => {
        const index = (e as any).selected[0].getProperties().index
        const path = currentPaths.find(p => p.index === index)
        Dispatcher.dispatch(new SetSelectedPath(path!.path))
    })
    select.set('gh:select_path_interaction', true)
    map.addInteraction(select)

    const selectedPathLayer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(createSelectedPath(selectedPath)),
        }),
        style: () =>
            new Style({
                stroke: new Stroke({
                    color: '#275DAD',
                    width: 8,
                    lineCap: 'round',
                    lineJoin: 'round',
                }),
            }),
    })
    selectedPathLayer.set(selectedPathLayerKey, true)
    selectedPathLayer.setZIndex(2)
    map.addLayer(selectedPathLayer)

    return null
}

function createSelectedPath(path: Path) {
    const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {},
                geometry: { ...path.points, coordinates: path.points.coordinates.map(c => fromLonLat(c)) },
            },
        ],
    }
    return featureCollection
}

function createUnselectedPaths(indexPaths: { path: Path; index: number }[]) {
    const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: indexPaths.map(indexPath => {
            return {
                type: 'Feature',
                properties: {
                    index: indexPath.index,
                },
                geometry: {
                    ...indexPath.path.points,
                    coordinates: indexPath.path.points.coordinates.map(c => fromLonLat(c)),
                },
            }
        }),
    }
    return featureCollection
}

function removePathLayers(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(pathsLayerKey) || l.get(selectedPathLayerKey))
        .forEach(l => map.removeLayer(l))
}
