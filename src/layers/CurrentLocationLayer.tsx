import React from 'react'
import { Coordinate } from '@/stores/QueryStore'

import { FeatureCollection } from 'geojson'
import { Layer, Source } from 'react-map-gl'
import { MapLayer } from '@/layers/MapLayer'

const currentLocationLayerKey = 'currentLocationLayer'

export default function (coordinate: Coordinate): MapLayer {
    const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Point', coordinates: [coordinate.lng, coordinate.lat] },
            },
        ],
    }

    return {
        interactiveLayerIds: [],
        onClick: (feature: any) => {},
        layer: (
            <Source type={'geojson'} data={featureCollection}>
                <Layer
                    id={currentLocationLayerKey}
                    type={'circle'}
                    paint={{
                        'circle-color': '#385af5',
                        'circle-radius': 8,
                        'circle-stroke-color': 'white',
                        'circle-stroke-width': 4,
                    }}
                />
            </Source>
        ),
    }
}
