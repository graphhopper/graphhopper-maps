import { calculateNiceTicks, formatDistanceLabel, formatElevationLabel } from '@/pathDetails/elevationWidget/axisUtils'

describe('axisUtils', () => {
    describe('calculateNiceTicks', () => {
        it('returns single value when min equals max', () => {
            expect(calculateNiceTicks(100, 100, 5)).toEqual([100])
        })

        it('returns ticks spanning the range', () => {
            const ticks = calculateNiceTicks(0, 100, 5)
            expect(ticks[0]).toBeLessThanOrEqual(0)
            expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(100)
        })

        it('produces nice round numbers', () => {
            const ticks = calculateNiceTicks(0, 1000, 6)
            for (const t of ticks) {
                expect(t % 200).toBe(0)
            }
        })

        it('handles negative to positive range', () => {
            const ticks = calculateNiceTicks(-50, 50, 5)
            expect(ticks[0]).toBeLessThanOrEqual(-50)
            expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(50)
        })

        it('handles small ranges', () => {
            const ticks = calculateNiceTicks(100, 105, 5)
            expect(ticks.length).toBeGreaterThanOrEqual(2)
            expect(ticks[0]).toBeLessThanOrEqual(100)
            expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(105)
        })

        it('returns sorted ascending ticks', () => {
            const ticks = calculateNiceTicks(0, 500, 8)
            for (let i = 1; i < ticks.length; i++) {
                expect(ticks[i]).toBeGreaterThan(ticks[i - 1])
            }
        })

        it('never produces more visible ticks than maxTicks', () => {
            // Various distances (in meters) that previously caused too many ticks
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

        it('produces at least 2 visible ticks for compact 18km route', () => {
            const plotWidth = 350
            const maxTicks = Math.max(2, Math.floor(plotWidth / 65))
            const totalDist = 18000
            const ticks = calculateNiceTicks(0, totalDist, maxTicks)
            const visible = ticks.filter(t => t > 0 && t <= totalDist)
            expect(visible.length).toBeGreaterThanOrEqual(2)
        })

        it('ensures sufficient pixel spacing for x-axis labels', () => {
            const minSpacingPx = 60
            // Test at compact (~350px plot) and expanded (~1200px plot) widths
            const plotWidths = [350, 700, 1200]
            const distances = [1703000, 50000, 500000, 5000000]
            for (const plotWidth of plotWidths) {
                const maxTicks = Math.max(2, Math.floor(plotWidth / 65))
                for (const totalDist of distances) {
                    const ticks = calculateNiceTicks(0, totalDist, maxTicks)
                    const visible = ticks.filter(t => t >= 0 && t <= totalDist)
                    if (visible.length < 2) continue
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
})
