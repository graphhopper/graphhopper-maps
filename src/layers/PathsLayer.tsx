import { Path } from '@/api/graphhopper'
import { FeatureCollection, LineString } from 'geojson'
import { Layer, Source } from 'react-map-gl'
import React from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { SetSelectedPath } from '@/actions/Actions'
import { MapLayer } from '@/stores/MapLayerStore'

const pathsLayerKey = 'pathsLayer'
const selectedPathLayerKey = 'selectedPathLayer'

export default function (selectedPath: Path, paths: Path[]): MapLayer {
    const currentPaths = paths
        .map((path, i) => {
            return {
                path,
                index: i,
            }
        })
        .filter(indexPath => indexPath.path !== selectedPath)
    return {
        id: 'paths-layer',
        interactiveLayerIds: currentPaths.length === 0 ? [] : [pathsLayerKey],
        onClick: (feature: any) => {
            // select an alternative path if clicked
            if (feature.layer.id === pathsLayerKey) {
                const index = feature.properties!.index
                const path = currentPaths.find(indexPath => indexPath.index === index)
                Dispatcher.dispatch(new SetSelectedPath(path!.path))
            }
        },
        layer: (
            <>
                {createUnselectedPaths(currentPaths)}
                {createSelectedPath(selectedPath)}
            </>
        ),
    }
}

function createSelectedPath(path: Path) {
    const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {},
                geometry: path.points as LineString,
            },
        ],
    }
    return (
        <Source type={'geojson'} data={featureCollection}>
            <Layer
                id={selectedPathLayerKey}
                type={'line'}
                layout={{
                    'line-join': 'round',
                    'line-cap': 'round',
                }}
                paint={{
                    'line-color': '#275DAD',
                    'line-width': 8,
                }}
            />
        </Source>
    )
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
                geometry: indexPath.path.points as LineString,
            }
        }),
    }
    return (
        <Source type={'geojson'} data={featureCollection}>
            <Layer
                id={pathsLayerKey}
                type={'line'}
                layout={{
                    'line-join': 'round',
                    'line-cap': 'round',
                }}
                paint={{
                    'line-color': '#5B616A',
                    'line-width': 6,
                    'line-opacity': 0.8,
                }}
            />
        </Source>
    )
}
