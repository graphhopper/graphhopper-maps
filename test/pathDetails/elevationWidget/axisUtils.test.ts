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
