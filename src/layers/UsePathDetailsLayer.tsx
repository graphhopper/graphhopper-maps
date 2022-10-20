import { Map } from 'ol'
import React, { useEffect } from 'react'
import { Coordinate } from '@/stores/QueryStore'
import { FeatureCollection } from 'geojson'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Stroke, Style } from 'ol/style'
import { GeoJSON } from 'ol/format'
import { fromLonLat } from 'ol/proj'
import { useStore } from '@/stores/useStore'

const highlightedPathSegmentLayerKey = 'highlightedPathSegmentLayer'

/**
 * This layer highlights path segments that are above the elevation threshold set by the horizontal line in the
 * path details diagram.
 */
export default function usePathDetailsLayer(map: Map) {
    const highlightedSegments = useStore(state => state.pathDetailsHighlightedSegments)
    useEffect(() => {
        removePathSegmentsLayer(map)
        addPathSegmentsLayer(map, highlightedSegments)
        return () => {
            removePathSegmentsLayer(map)
        }
    }, [map, highlightedSegments])
    return
}

function removePathSegmentsLayer(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(highlightedPathSegmentLayerKey))
        .forEach(l => map.removeLayer(l))
}

function addPathSegmentsLayer(map: Map, highlightedSegments: Coordinate[][]) {
    const highlightedPathSegmentsLayer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(createHighlightedPathSegments(highlightedSegments)),
        }),
        style: () =>
            new Style({
                stroke: new Stroke({
                    // todo
                    color: 'red',
                    width: 4,
                    lineCap: 'round',
                    lineJoin: 'round',
                }),
            }),
    })
    highlightedPathSegmentsLayer.set(highlightedPathSegmentLayerKey, true)
    highlightedPathSegmentsLayer.setZIndex(3)
    map.addLayer(highlightedPathSegmentsLayer)
}

function createHighlightedPathSegments(segments: Coordinate[][]) {
    const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'MultiLineString',
                    coordinates: segments.map(s => s.map(c => fromLonLat([c.lng, c.lat]))),
                },
                properties: {},
            },
        ],
    }
    return featureCollection
}
