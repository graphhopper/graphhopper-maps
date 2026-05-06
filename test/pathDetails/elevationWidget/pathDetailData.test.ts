import {
    extractElevationPoints,
    calculateViaPointDistances,
    transformPathDetail,
    sanitizeNumericValues,
    buildChartData,
    buildInclineDetail,
    SLOPE_HORIZON_M,
} from '@/pathDetails/elevationWidget/pathDetailData'
import { getSlopeColor } from '@/pathDetails/elevationWidget/colors'
import type { ElevationPoint } from '@/pathDetails/elevationWidget/types'

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

    describe('buildInclineDetail color binning', () => {
        // Reproduces the GraphHopper-encoded-polyline noise pattern: a few sample points
        // that are close together (<20m) with ~1m elevation jitter from quantization,
        // surrounded by long, gently uphill sub-segments. Without windowed slopes the
        // tiny jitter sub-segment would paint a 600m+ stretch as a steep decline.
        it('does not paint a long stretch as steep decline due to a single short noisy sub-segment', () => {
            const elev: ElevationPoint[] = [
                { distance: 0, elevation: 200, lng: 0, lat: 0 },
                { distance: 264, elevation: 207, lng: 0, lat: 0 }, // +2.65% over 264m (real gentle climb)
                { distance: 275, elevation: 206, lng: 0, lat: 0 }, // 1m drop over 11m → -9% (noise)
                { distance: 880, elevation: 220, lng: 0, lat: 0 }, // +2.31% over 605m
                { distance: 970, elevation: 220, lng: 0, lat: 0 }, // flat
                { distance: 985, elevation: 218, lng: 0, lat: 0 }, // 2m drop over 15m → -13% (noise)
                { distance: 1300, elevation: 222, lng: 0, lat: 0 }, // +1.27% over 315m
            ]
            const detail = buildInclineDetail(elev)

            // Compute total distance painted in each "decline" color category and the
            // overall direction of every painted segment. No segment longer than 100m
            // should ever be colored as decline (≤-6%) when the section actually climbs.
            const declineColors = new Set([getSlopeColor(-7), getSlopeColor(-15)])
            for (const seg of detail.segments) {
                const span = seg.toDistance - seg.fromDistance
                if (declineColors.has(seg.color) && span > 50) {
                    // Find the actual elevation change over this segment using the source data
                    const eAtFrom = interpElev(elev, seg.fromDistance)
                    const eAtTo = interpElev(elev, seg.toDistance)
                    const overall = ((eAtTo - eAtFrom) / span) * 100
                    expect(overall).toBeLessThan(0) // decline coloring should require an actual decline
                }
            }
        })

        it('still colors a real sustained descent as decline', () => {
            // Continuous -8% over 500m — every sample is part of a real steep descent.
            const elev: ElevationPoint[] = []
            for (let d = 0; d <= 500; d += 25) {
                elev.push({ distance: d, elevation: 200 - 0.08 * d, lng: 0, lat: 0 })
            }
            const detail = buildInclineDetail(elev)
            const declineColor = getSlopeColor(-7) // matches the -10..-6% bucket
            const declineSpan = detail.segments
                .filter(s => s.color === declineColor)
                .reduce((sum, s) => sum + (s.toDistance - s.fromDistance), 0)
            // Most of the route should be painted as decline (allow a small horizon tail-off)
            expect(declineSpan).toBeGreaterThan(500 - SLOPE_HORIZON_M * 2)
        })
    })
})

// Linear interpolation of elevation at a given distance along the series.
function interpElev(elev: ElevationPoint[], distance: number): number {
    if (elev.length === 0) return 0
    if (distance <= elev[0].distance) return elev[0].elevation
    if (distance >= elev[elev.length - 1].distance) return elev[elev.length - 1].elevation
    for (let i = 0; i < elev.length - 1; i++) {
        if (distance >= elev[i].distance && distance <= elev[i + 1].distance) {
            const t = (distance - elev[i].distance) / (elev[i + 1].distance - elev[i].distance)
            return elev[i].elevation + t * (elev[i + 1].elevation - elev[i].elevation)
        }
    }
    return 0
}
