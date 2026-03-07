import { Map } from 'ol'
import { useEffect } from 'react'
import { PathDetailsStoreState } from '@/stores/PathDetailsStore'
import { FeatureCollection } from 'geojson'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Stroke, Style } from 'ol/style'
import { GeoJSON } from 'ol/format'
import { fromLonLat } from 'ol/proj'
import { Coordinate } from '@/utils'
import { ChartPathDetail } from '@/pathDetails/elevationWidget/types'

const highlightedPathSegmentLayerKey = 'highlightedPathSegmentLayer'
const activeDetailLayerKey = 'activeDetailLayer'

/**
 * This layer highlights path segments that are above the elevation threshold set by the horizontal line in the
 * path details diagram, and also draws colored route segments when a path detail is active.
 */
export default function usePathDetailsLayer(
    map: Map,
    pathDetails: PathDetailsStoreState,
) {
    // Highlighted segments (elevation threshold)
    useEffect(() => {
        removeLayer(map, highlightedPathSegmentLayerKey)
        addPathSegmentsLayer(map, pathDetails)
        return () => {
            removeLayer(map, highlightedPathSegmentLayerKey)
        }
    }, [map, pathDetails])

    // Active detail colored segments
    useEffect(() => {
        removeLayer(map, activeDetailLayerKey)
        if (pathDetails.activeDetail) {
            addActiveDetailLayer(map, pathDetails.activeDetail)
        }
        return () => {
            removeLayer(map, activeDetailLayerKey)
        }
    }, [map, pathDetails.activeDetail])

    return
}

function removeLayer(map: Map, key: string) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(key))
        .forEach(l => map.removeLayer(l))
}

function addPathSegmentsLayer(map: Map, pathDetails: PathDetailsStoreState) {
    const style = new Style({
        stroke: new Stroke({
            color: 'red',
            width: 4,
            lineCap: 'round',
            lineJoin: 'round',
        }),
    })
    const highlightedPathSegmentsLayer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(
                createHighlightedPathSegments(pathDetails.pathDetailsHighlightedSegments),
            ),
        }),
        style: () => style,
    })
    highlightedPathSegmentsLayer.set(highlightedPathSegmentLayerKey, true)
    highlightedPathSegmentsLayer.setZIndex(3)
    map.addLayer(highlightedPathSegmentsLayer)
}

function addActiveDetailLayer(map: Map, detail: ChartPathDetail) {
    // Sort segments so shorter ones are drawn last (on top).
    // This ensures small distinctive segments (e.g. steps, cobblestone)
    // aren't overshadowed by adjacent longer segments with round line caps.
    const sorted = [...detail.segments].sort((a, b) => b.coordinates.length - a.coordinates.length)

    const features: any[] = sorted.map(seg => ({
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: seg.coordinates.map(c => fromLonLat(c)),
        },
        properties: {
            color: seg.color,
        },
    }))

    const featureCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features,
    }

    const styleCache: Record<string, Style> = {}
    const layer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(featureCollection),
        }),
        style: (feature) => {
            const color = feature.get('color') || '#666'
            let style = styleCache[color]
            if (!style) {
                style = new Style({
                    stroke: new Stroke({
                        color,
                        width: 6,
                        lineCap: 'butt',
                        lineJoin: 'round',
                    }),
                })
                styleCache[color] = style
            }
            return style
        },
    })
    layer.set(activeDetailLayerKey, true)
    layer.setZIndex(2)
    map.addLayer(layer)
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
