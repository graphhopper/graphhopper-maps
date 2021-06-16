import { Layer, Popup, Source } from 'react-map-gl'
import React from 'react'
import { PathDetailsPoint } from '@/stores/PathDetailsStore'
import { Coordinate } from '@/stores/QueryStore'
import { FeatureCollection } from 'geojson'

const highlightedPathSegmentLayerKey = 'highlightedPathSegmentLayer'

interface PathDetailsLayerProps {
    pathDetailPoint: PathDetailsPoint | null
    highlightedPathDetailSegments: Coordinate[][]
}

export default function ({ pathDetailPoint, highlightedPathDetailSegments }: PathDetailsLayerProps) {
    return (
        <>
            {pathDetailPoint && createPathDetailMarker(pathDetailPoint)}
            {createHighlightedPathSegments(highlightedPathDetailSegments)}
        </>
    )
}

function createPathDetailMarker(point: PathDetailsPoint) {
    // todo: use createMapMarker from heightgraph?
    // {createMapMarker(point.elevation, point.description)}
    return (
        <Popup longitude={point.point.lng} latitude={point.point.lat} closeButton={false}>
            <p>
                elevation: {point.elevation}
                <br />
                {point.description}
            </p>
        </Popup>
    )
}

function createHighlightedPathSegments(segments: Coordinate[][]) {
    const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'MultiLineString',
                    coordinates: segments.map(s => s.map(c => [c.lng, c.lat])),
                },
                properties: {},
            },
        ],
    }

    return (
        <Source type={'geojson'} data={featureCollection}>
            <Layer
                id={highlightedPathSegmentLayerKey}
                type={'line'}
                layout={{
                    'line-join': 'round',
                    'line-cap': 'round',
                }}
                paint={{
                    // todo
                    'line-color': 'red',
                    'line-width': 4,
                }}
            />
        </Source>
    )
}
