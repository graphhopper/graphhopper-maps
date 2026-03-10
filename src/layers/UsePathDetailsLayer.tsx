import { Map } from 'ol'
import type { MapBrowserEvent } from 'ol'
import { useEffect, useRef } from 'react'
import { PathDetailsStoreState } from '@/stores/PathDetailsStore'
import { FeatureCollection } from 'geojson'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Stroke, Style } from 'ol/style'
import { GeoJSON } from 'ol/format'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Coordinate } from '@/utils'
import { ChartPathDetail } from '@/pathDetails/elevationWidget/types'
import Dispatcher from '@/stores/Dispatcher'
import { PathDetailsHover } from '@/actions/Actions'

const highlightedPathSegmentLayerKey = 'highlightedPathSegmentLayer'
const activeDetailLayerKey = 'activeDetailLayer'

/**
 * This layer highlights path segments that are above the elevation threshold set by the horizontal line in the
 * path details diagram, and also draws colored route segments when a path detail is active.
 */
export default function usePathDetailsLayer(
    map: Map,
    pathDetails: PathDetailsStoreState,
    activeDetail: ChartPathDetail | null = null,
    showPaths: boolean = true,
    pathCoordinates: number[][] = [],
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
        if (activeDetail && showPaths) {
            addActiveDetailLayer(map, activeDetail)
        }
        return () => {
            removeLayer(map, activeDetailLayerKey)
        }
    }, [map, activeDetail, showPaths])

    // Pre-compute cumulative distances for the path coordinates
    const cumDistRef = useRef<number[]>([])
    useEffect(() => {
        if (pathCoordinates.length === 0) {
            cumDistRef.current = []
            return
        }
        const distances = [0]
        for (let i = 1; i < pathCoordinates.length; i++) {
            const [lng1, lat1] = pathCoordinates[i - 1]
            const [lng2, lat2] = pathCoordinates[i]
            const toRad = (deg: number) => deg * 0.017453292519943295
            const dLat = toRad(lat2 - lat1)
            const dLon = toRad(lng2 - lng1)
            const x = Math.cos(toRad((lat1 + lat2) / 2)) * dLon
            distances.push(distances[i - 1] + 6371000 * Math.sqrt(dLat * dLat + x * x))
        }
        cumDistRef.current = distances
    }, [pathCoordinates])

    // Hover interaction on active detail layer
    const isHoveringRef = useRef(false)
    const rafRef = useRef(0)
    useEffect(() => {
        if (!activeDetail || !showPaths || pathCoordinates.length === 0) return

        const handler = (e: MapBrowserEvent<any>) => {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = requestAnimationFrame(() => {
                const activeLayer = map
                    .getLayers()
                    .getArray()
                    .find(l => l.get(activeDetailLayerKey))
                if (!activeLayer) return

                const features = map.getFeaturesAtPixel(e.pixel, {
                    layerFilter: l => l === activeLayer,
                    hitTolerance: 5,
                })

                if (features.length > 0) {
                    const feature = features[0]
                    const value = feature.get('value')
                    const isIncline = activeDetail.key === '_incline'
                    const description = value != null && !isIncline ? String(value) : ''
                    const featureColor = feature.get('color') as string | undefined

                    // Use segment distance bounds to narrow the coordinate search
                    const fromDist = feature.get('fromDistance') as number | undefined
                    const toDist = feature.get('toDistance') as number | undefined

                    const [lng, lat] = toLonLat(e.coordinate)
                    const cumDist = cumDistRef.current
                    const searchFrom = fromDist != null ? Math.max(0, binarySearchDist(cumDist, fromDist) - 1) : 0
                    const searchTo = toDist != null ? Math.min(pathCoordinates.length - 1, binarySearchDist(cumDist, toDist) + 1) : pathCoordinates.length - 1
                    const nearest = findNearestPoint(lng, lat, pathCoordinates, cumDist, searchFrom, searchTo)

                    Dispatcher.dispatch(
                        new PathDetailsHover({
                            point: { lng, lat },
                            elevation: nearest.elevation,
                            description,
                            distance: nearest.distance,
                            incline: nearest.incline,
                            color: featureColor,
                        })
                    )
                    isHoveringRef.current = true
                } else if (isHoveringRef.current) {
                    Dispatcher.dispatch(new PathDetailsHover(null))
                    isHoveringRef.current = false
                }
            })
        }

        map.on('pointermove', handler as any)
        map.on('click', handler as any)
        return () => {
            map.un('pointermove', handler as any)
            map.un('click', handler as any)
            cancelAnimationFrame(rafRef.current)
            if (isHoveringRef.current) {
                Dispatcher.dispatch(new PathDetailsHover(null))
                isHoveringRef.current = false
            }
        }
    }, [map, activeDetail, showPaths, pathCoordinates])

    return
}

function binarySearchDist(cumDist: number[], target: number): number {
    let lo = 0
    let hi = cumDist.length - 1
    while (lo < hi) {
        const mid = (lo + hi) >> 1
        if (cumDist[mid] < target) lo = mid + 1
        else hi = mid
    }
    return lo
}

function findNearestPoint(
    lng: number,
    lat: number,
    coordinates: number[][],
    cumDist: number[],
    from: number,
    to: number,
): { elevation: number; distance: number; incline: number | undefined } {
    let minDist = Infinity
    let bestIdx = from
    for (let i = from; i <= to; i++) {
        const dlng = coordinates[i][0] - lng
        const dlat = coordinates[i][1] - lat
        const dist = dlng * dlng + dlat * dlat
        if (dist < minDist) {
            minDist = dist
            bestIdx = i
        }
    }

    const elevation = coordinates[bestIdx][2] || 0
    const distance = cumDist[bestIdx] || 0

    let incline: number | undefined
    if (coordinates.length >= 2) {
        const a = bestIdx > 0 ? bestIdx - 1 : bestIdx
        const b = bestIdx > 0 ? bestIdx : Math.min(bestIdx + 1, coordinates.length - 1)
        const segDist = (cumDist[b] || 0) - (cumDist[a] || 0)
        if (segDist > 0) {
            incline = (((coordinates[b][2] || 0) - (coordinates[a][2] || 0)) / segDist) * 100
        }
    }

    return { elevation, distance, incline }
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
            value: seg.value,
            fromDistance: seg.fromDistance,
            toDistance: seg.toDistance,
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
