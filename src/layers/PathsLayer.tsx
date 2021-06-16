import { Path } from '@/api/graphhopper'
import { FeatureCollection, LineString } from 'geojson'
import { Layer, Source } from 'react-map-gl'
import React from 'react'

// todo: do not export this but move code using it here
export const pathsLayerKey = 'pathsLayer'
const selectedPathLayerKey = 'selectedPathLayer'

interface PathsLayerProps {
    selectedPath: Path
    paths: Path[]
}

// todo: do not export this but move code using it here
export function getCurrentPaths(selectedPath: Path, paths: Path[]) {
    return paths
        .map((path, i) => {
            return {
                path,
                index: i,
            }
        })
        .filter(indexPath => indexPath.path !== selectedPath)
}

// todo: do not export this but move code using it here
export function getInteractiveLayerIds(selectedPath: Path, paths: Path[]) {
    return getCurrentPaths(selectedPath, paths).length === 0 ? [] : [pathsLayerKey]
}

export default function ({ selectedPath, paths }: PathsLayerProps) {
    const currentPaths = getCurrentPaths(selectedPath, paths)
    return (
        <>
            {createUnselectedPaths(currentPaths)}
            {createSelectedPath(selectedPath)}
        </>
    )
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
