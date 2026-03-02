import {
    extractElevationPoints,
    calculateViaPointDistances,
    transformPathDetail,
    sanitizeNumericValues,
    buildChartData,
} from '@/pathDetails/elevationWidget/pathDetailData'

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
                points: { coordinates: [[13.0, 52.0], [13.1, 52.0]] },
                snapped_waypoints: { coordinates: [[13.0, 52.0], [13.1, 52.0]] },
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
                        [13.0, 52.0],   // From
                        [13.05, 52.0],  // Via
                        [13.1, 52.0],   // To
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
                snapped_waypoints: { coordinates: [[13.0, 52.0], [13.01, 52.0]] },
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
                points: { coordinates: [[13.0, 52.0, 100], [13.01, 52.0, 110]] },
                snapped_waypoints: { coordinates: [[13.0, 52.0], [13.01, 52.0]] },
                details: {},
                distance: 700,
            }
            const alt = {
                points: { coordinates: [[13.0, 52.0, 100], [13.005, 52.001, 120], [13.01, 52.0, 110]] },
                snapped_waypoints: { coordinates: [[13.0, 52.0], [13.01, 52.0]] },
                details: {},
                distance: 900,
            }
            const result = buildChartData(main, [alt], k => k)
            expect(result.alternativeElevations).toHaveLength(1)
            expect(result.alternativeElevations[0]).toHaveLength(3)
        })
    })
})
