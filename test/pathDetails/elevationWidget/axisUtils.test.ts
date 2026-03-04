import { calculateNiceTicks, formatDistanceLabel, formatElevationLabel, computeDetailYRange, formatDetailTick } from '@/pathDetails/elevationWidget/axisUtils'

describe('axisUtils', () => {
    describe('calculateNiceTicks', () => {
        it('returns single value when min equals max', () => {
            expect(calculateNiceTicks(100, 100, 5)).toEqual([100])
        })

        it('returns ticks spanning the range', () => {
            const cases: [number, number, number][] = [
                [0, 100, 5],
                [-50, 50, 5],
                [100, 105, 5],
            ]
            for (const [min, max, maxTicks] of cases) {
                const ticks = calculateNiceTicks(min, max, maxTicks)
                expect(ticks.length).toBeGreaterThanOrEqual(2)
                expect(ticks[0]).toBeLessThanOrEqual(min)
                expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max)
            }
        })

        it('produces nice round numbers', () => {
            const ticks = calculateNiceTicks(0, 1000, 6)
            for (const t of ticks) {
                expect(t % 200).toBe(0)
            }
        })

        it('returns sorted ascending ticks', () => {
            const ticks = calculateNiceTicks(0, 500, 8)
            for (let i = 1; i < ticks.length; i++) {
                expect(ticks[i]).toBeGreaterThan(ticks[i - 1])
            }
        })

        it('never produces more visible ticks than maxTicks', () => {
            const cases: [number, number, number][] = [
                [0, 1703000, 6],  // 1703 km
                [0, 5000000, 6],  // 5000 km
                [0, 999000, 6],   // 999 km
                [0, 100, 5],
                [0, 50000, 6],
                [-50, 50, 5],
                [0, 1000, 6],
                [0, 82100, 5],    // 82.1 km compact
                [0, 18000, 5],    // 18 km compact
            ]
            for (const [min, max, maxTicks] of cases) {
                const ticks = calculateNiceTicks(min, max, maxTicks)
                const visible = ticks.filter(t => t >= min && t <= max)
                expect(visible.length).toBeLessThanOrEqual(maxTicks)
            }
        })

        it('ensures sufficient ticks and pixel spacing for x-axis labels', () => {
            const minSpacingPx = 60
            const plotWidths = [350, 700, 1200]
            const distances = [18000, 50000, 82100, 500000, 1703000, 5000000]
            for (const plotWidth of plotWidths) {
                const maxTicks = Math.max(2, Math.floor(plotWidth / 65))
                for (const totalDist of distances) {
                    const ticks = calculateNiceTicks(0, totalDist, maxTicks)
                    const visible = ticks.filter(t => t >= 0 && t <= totalDist)
                    expect(visible.length).toBeGreaterThanOrEqual(2)
                    for (let i = 1; i < visible.length; i++) {
                        const pxGap = ((visible[i] - visible[i - 1]) / totalDist) * plotWidth
                        expect(pxGap).toBeGreaterThanOrEqual(minSpacingPx)
                    }
                }
            }
        })
    })

    describe('formatDistanceLabel', () => {
        it('formats meters for short distances (metric)', () => {
            expect(formatDistanceLabel(500, false)).toBe('500 m')
        })

        it('formats kilometers for longer distances (metric)', () => {
            expect(formatDistanceLabel(5000, false)).toBe('5 km')
        })

        it('formats kilometers with decimal', () => {
            expect(formatDistanceLabel(1500, false)).toBe('1.5 km')
        })

        it('formats feet for short distances (imperial)', () => {
            expect(formatDistanceLabel(30, true)).toBe('98 ft')
        })

        it('formats miles for longer distances (imperial)', () => {
            expect(formatDistanceLabel(5000, true)).toBe('3.11 mi')
        })
    })

    describe('formatElevationLabel', () => {
        it('formats meters', () => {
            expect(formatElevationLabel(500, false)).toBe('500 m')
        })

        it('formats feet', () => {
            expect(formatElevationLabel(100, true)).toBe('328 ft')
        })

        it('rounds to nearest integer', () => {
            expect(formatElevationLabel(100.7, false)).toBe('101 m')
        })
    })

    describe('computeDetailYRange', () => {
        it('adds 10% padding and clamps non-negative min to 0', () => {
            // curvature-like: 0.5–1.0, range=0.5, pad=0.05
            expect(computeDetailYRange(0.5, 1.0)).toEqual({ min: expect.closeTo(0.45), max: expect.closeTo(1.05) })
            // speed-like: non-negative min clamped to 0
            expect(computeDetailYRange(10, 120).min).toBe(0)
            // negative data: no clamping
            expect(computeDetailYRange(-10, 10).min).toBeCloseTo(-12)
            // equal min/max: uses fallback range
            expect(computeDetailYRange(5, 5).min).toBeLessThan(5)
        })
    })

    describe('formatDetailTick', () => {
        it('uses enough decimals to keep ticks distinct', () => {
            expect(formatDetailTick(10, [0, 10, 20])).toBe('10')
            expect(formatDetailTick(0.6, [0.4, 0.6, 0.8, 1.0])).toBe('0.6')
            expect(formatDetailTick(1.0, [0.4, 0.6, 0.8, 1.0])).toBe('1.0')
            expect(formatDetailTick(0.01, [0.01, 0.02, 0.03])).toBe('0.01')
        })
    })
})
