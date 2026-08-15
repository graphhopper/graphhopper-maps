import {
    extractElevationPoints,
    calculateViaPointDistances,
    transformPathDetail,
    sanitizeNumericValues,
    buildChartData,
    computeElevationColorRuns,
} from '@/pathDetails/elevationWidget/pathDetailData'
import { ElevationPoint } from '@/pathDetails/elevationWidget/types'

// Create a list of mock ElevationPoint objects from (distance, elevation) pairs.
function pts(pairs: [number, number][]): ElevationPoint[] {
    return pairs.map(([distance, elevation]) => ({ distance, elevation, lng: 0, lat: 0 }))
}

describe('pathDetailData', () => {
    describe('extractElevationPoints', () => {
        it('returns empty array for empty coordinates', () => {
            expect(extractElevationPoints([])).toEqual([])
        })

        it('returns single point with distance 0', () => {
            const result = extractElevationPoints([[13.4, 52.5, 100]])
            expect(result).toHaveLength(1)
            expect(result[0].distance).toBe(0)
            expect(result[0].elevation).toBe(100)
            expect(result[0].lng).toBe(13.4)
            expect(result[0].lat).toBe(52.5)
        })

        it('computes cumulative distances', () => {
            const coords = [
                [13.0, 52.0, 100],
                [13.01, 52.0, 110],
                [13.02, 52.0, 105],
            ]
            const result = extractElevationPoints(coords)
            expect(result).toHaveLength(3)
            expect(result[0].distance).toBe(0)
            expect(result[1].distance).toBeGreaterThan(0)
            expect(result[2].distance).toBeGreaterThan(result[1].distance)
        })

        it('handles 2D coordinates with zero elevation', () => {
            const coords = [
                [13.0, 52.0],
                [13.01, 52.0],
            ]
            const result = extractElevationPoints(coords)
            expect(result[0].elevation).toBe(0)
            expect(result[1].elevation).toBe(0)
        })
    })

    describe('calculateViaPointDistances', () => {
        it('returns empty for paths with no via points', () => {
            const path = {
                points: {
                    coordinates: [
                        [13.0, 52.0],
                        [13.1, 52.0],
                    ],
                },
                snapped_waypoints: {
                    coordinates: [
                        [13.0, 52.0],
                        [13.1, 52.0],
                    ],
                },
                details: {},
                distance: 1000,
            }
            expect(calculateViaPointDistances(path)).toEqual([])
        })

        it('returns empty for empty path', () => {
            const path = {
                points: { coordinates: [] },
                snapped_waypoints: { coordinates: [] },
                details: {},
                distance: 0,
            }
            expect(calculateViaPointDistances(path)).toEqual([])
        })

        it('finds via point distance', () => {
            const coords = [
                [13.0, 52.0],
                [13.05, 52.0],
                [13.1, 52.0],
            ]
            const path = {
                points: { coordinates: coords },
                snapped_waypoints: {
                    coordinates: [
                        [13.0, 52.0], // From
                        [13.05, 52.0], // Via
                        [13.1, 52.0], // To
                    ],
                },
                details: {},
                distance: 5000,
            }
            const result = calculateViaPointDistances(path)
            expect(result).toHaveLength(1)
            expect(result[0]).toBeGreaterThan(0)
        })
    })

    describe('sanitizeNumericValues', () => {
        it('caps Infinity at 99th percentile', () => {
            const entries: [number, number, any][] = [
                [0, 1, 50],
                [1, 2, 100],
                [2, 3, Infinity],
            ]
            const result = sanitizeNumericValues(entries)
            expect(result[2][2]).toBe(100)
        })

        it('does nothing for normal values', () => {
            const entries: [number, number, any][] = [
                [0, 1, 50],
                [1, 2, 100],
            ]
            const result = sanitizeNumericValues(entries)
            expect(result).toEqual(entries)
        })
    })

    describe('transformPathDetail', () => {
        const coords = [
            [13.0, 52.0, 100],
            [13.01, 52.0, 110],
            [13.02, 52.0, 105],
        ]
        const cumDist = [0, 700, 1400]

        it('creates bars for string values', () => {
            const entries: [number, number, any][] = [
                [0, 1, 'asphalt'],
                [1, 2, 'gravel'],
            ]
            const result = transformPathDetail('surface', 'Surface', entries, coords, cumDist)
            expect(result.type).toBe('bars')
            expect(result.segments).toHaveLength(2)
            expect(result.segments[0].value).toBe('asphalt')
            expect(result.legend.length).toBeGreaterThanOrEqual(2)
        })

        it('creates line for numeric values', () => {
            const entries: [number, number, any][] = [
                [0, 1, 30],
                [1, 2, 50],
            ]
            const result = transformPathDetail('max_speed', 'Max Speed', entries, coords, cumDist)
            expect(result.type).toBe('line')
            expect(result.minValue).toBe(30)
            expect(result.maxValue).toBe(50)
        })

        it('creates bars for boolean values', () => {
            const entries: [number, number, any][] = [
                [0, 1, true],
                [1, 2, false],
            ]
            const result = transformPathDetail('get_off_bike', 'Get off bike', entries, coords, cumDist)
            expect(result.type).toBe('bars')
        })

        it('produces distinct legend labels for small numeric ranges', () => {
            const entries: [number, number, any][] = [
                [0, 1, 0.5],
                [1, 2, 1.0],
            ]
            const result = transformPathDetail('curvature', 'Curvature', entries, coords, cumDist)
            expect(result.type).toBe('line')
            const labels = result.legend.map(l => l.label)
            expect(new Set(labels).size).toBe(labels.length)
        })

        it('assigns missing color for special values', () => {
            const entries: [number, number, any][] = [
                [0, 1, 'missing'],
                [1, 2, 'asphalt'],
            ]
            const result = transformPathDetail('surface', 'Surface', entries, coords, cumDist)
            expect(result.segments[0].color).toBe('#dddddd')
        })
    })

    describe('computeElevationColorRuns', () => {
        const GREEN = '#2E7D32' // -6..3%
        const BLUE = '#42A5F5' // -10..-6%
        const DARK_BLUE = '#1565C0' // < -10%
        const RED = '#F44336' // 6..10%

        it('returns no runs for fewer than two points', () => {
            expect(computeElevationColorRuns([], 1)).toEqual([])
            expect(computeElevationColorRuns(pts([[0, 100]]), 1)).toEqual([])
        })

        it('colors each segment by its exact grade when bins are per-segment (the reported case)', () => {
            // Steep descent into a dip, then a climb out. With a tiny bin width every
            // segment is its own bin, so the color is the segment's own grade: the climb
            // must read as a climb, not inherit the neighboring descent's color.
            const runs = computeElevationColorRuns(
                pts([
                    [0, 100],
                    [10, 98.5], // -15% -> dark blue
                    [20, 99.3], // +8%  -> red (uphill)
                ]),
                0.001,
            )
            expect(runs).toEqual([
                { fromIdx: 0, toIdx: 1, color: DARK_BLUE },
                { fromIdx: 1, toIdx: 2, color: RED },
            ])
        })

        it('averages a single noisy sample away inside a wide bin', () => {
            // 60m of flat ground with one +1m spike. The raw grade at the spike is ±10%,
            // but a bin spanning the whole route nets to 0% -> flat, so the spike cannot
            // paint the pixel steep.
            const runs = computeElevationColorRuns(
                pts([
                    [0, 100],
                    [10, 100],
                    [20, 101], // spike
                    [30, 100],
                    [40, 100],
                    [50, 100],
                    [60, 100],
                ]),
                1000,
            )
            expect(runs).toEqual([{ fromIdx: 0, toIdx: 6, color: GREEN }])
        })

        it('merges a sustained steep grade into one run', () => {
            // Steady -8% descent: every per-segment bin is blue, so they merge.
            const runs = computeElevationColorRuns(
                pts([
                    [0, 100],
                    [10, 99.2],
                    [20, 98.4],
                    [30, 97.6],
                ]),
                0.001,
            )
            expect(runs).toEqual([{ fromIdx: 0, toIdx: 3, color: BLUE }])
        })
    })

    describe('buildChartData', () => {
        it('builds complete chart data', () => {
            const path = {
                points: {
                    coordinates: [
                        [13.0, 52.0, 100],
                        [13.01, 52.0, 110],
                        [13.02, 52.0, 105],
                    ],
                },
                snapped_waypoints: {
                    coordinates: [
                        [13.0, 52.0],
                        [13.02, 52.0],
                    ],
                },
                details: {
                    road_class: [
                        [0, 1, 'primary'],
                        [1, 2, 'secondary'],
                    ] as [number, number, any][],
                },
                distance: 1400,
            }
            const result = buildChartData(path, [], k => k)
            expect(result.elevation).toHaveLength(3)
            expect(result.totalDistance).toBe(1400)
            expect(result.pathDetails).toHaveLength(1)
            expect(result.pathDetails[0].key).toBe('road_class')
        })

        it('handles 2D coordinates', () => {
            const path = {
                points: {
                    coordinates: [
                        [13.0, 52.0],
                        [13.01, 52.0],
                    ],
                },
                snapped_waypoints: {
                    coordinates: [
                        [13.0, 52.0],
                        [13.01, 52.0],
                    ],
                },
                details: {},
                distance: 700,
            }
            const result = buildChartData(path, [], k => k)
            expect(result.elevation).toHaveLength(2)
            expect(result.elevation[0].elevation).toBe(0)
        })

        it('handles empty path', () => {
            const path = {
                points: { coordinates: [] },
                snapped_waypoints: { coordinates: [] },
                details: {},
                distance: 0,
            }
            const result = buildChartData(path, [], k => k)
            expect(result.elevation).toHaveLength(0)
        })

        it('includes alternative elevations', () => {
            const main = {
                points: {
                    coordinates: [
                        [13.0, 52.0, 100],
                        [13.01, 52.0, 110],
                    ],
                },
                snapped_waypoints: {
                    coordinates: [
                        [13.0, 52.0],
                        [13.01, 52.0],
                    ],
                },
                details: {},
                distance: 700,
            }
            const alt = {
                points: {
                    coordinates: [
                        [13.0, 52.0, 100],
                        [13.005, 52.001, 120],
                        [13.01, 52.0, 110],
                    ],
                },
                snapped_waypoints: {
                    coordinates: [
                        [13.0, 52.0],
                        [13.01, 52.0],
                    ],
                },
                details: {},
                distance: 900,
            }
            const result = buildChartData(main, [alt], k => k)
            expect(result.alternativeElevations).toHaveLength(1)
            expect(result.alternativeElevations[0]).toHaveLength(3)
        })
    })
})
