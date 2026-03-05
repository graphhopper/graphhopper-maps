import {
    getSlopeColor,
    getNumericGradientColor,
    assignDiscreteColors,
    getSpeedColor,
    getSpeedThresholds,
    getSpeedLabels,
    INCLINE_CATEGORIES,
    SPEED_COLORS,
    DISCRETE_PALETTE,
    SURFACE_COLORS,
    ROAD_CLASS_COLORS,
} from '@/pathDetails/elevationWidget/colors'

describe('colors', () => {
    describe('getSlopeColor', () => {
        it('returns flat color for 0-3% slopes', () => {
            expect(getSlopeColor(0)).toBe(INCLINE_CATEGORIES[0].color)
            expect(getSlopeColor(3)).toBe(INCLINE_CATEGORIES[0].color)
            expect(getSlopeColor(-2)).toBe(INCLINE_CATEGORIES[0].color)
        })

        it('returns mild color for 3-6% slopes', () => {
            expect(getSlopeColor(4)).toBe(INCLINE_CATEGORIES[1].color)
            expect(getSlopeColor(6)).toBe(INCLINE_CATEGORIES[1].color)
            expect(getSlopeColor(-5)).toBe(INCLINE_CATEGORIES[1].color)
        })

        it('returns steep color for 6-10% slopes', () => {
            expect(getSlopeColor(7)).toBe(INCLINE_CATEGORIES[2].color)
            expect(getSlopeColor(10)).toBe(INCLINE_CATEGORIES[2].color)
        })

        it('returns very steep color for >10% slopes', () => {
            expect(getSlopeColor(11)).toBe(INCLINE_CATEGORIES[3].color)
            expect(getSlopeColor(-25)).toBe(INCLINE_CATEGORIES[3].color)
        })
    })

    describe('getSpeedColor', () => {
        it('assigns colors by bucket for car profile', () => {
            const thresholds = getSpeedThresholds('car')
            expect(thresholds).toEqual([30, 50, 80])
            expect(getSpeedColor(20, thresholds)).toBe(SPEED_COLORS[0]) // < 30
            expect(getSpeedColor(40, thresholds)).toBe(SPEED_COLORS[1]) // 30-50
            expect(getSpeedColor(60, thresholds)).toBe(SPEED_COLORS[2]) // 50-80
            expect(getSpeedColor(100, thresholds)).toBe(SPEED_COLORS[3]) // >= 80
        })

        it('uses bike thresholds for bike profile', () => {
            const thresholds = getSpeedThresholds('bike')
            expect(thresholds).toEqual([5, 10, 15, 20])
            expect(getSpeedColor(3, thresholds)).toBe(SPEED_COLORS[0]) // < 5
            expect(getSpeedColor(25, thresholds)).toBe(SPEED_COLORS[4]) // >= 20
        })

        it('uses foot thresholds for hike profile', () => {
            const thresholds = getSpeedThresholds('hike')
            expect(thresholds).toEqual([3, 4, 5])
        })

        it('generates correct speed labels', () => {
            const labels = getSpeedLabels([30, 50, 80])
            expect(labels).toEqual(['< 30', '30\u201350', '50\u201380', '\u2265 80'])
        })
    })

    describe('getNumericGradientColor', () => {
        it('returns blue at lower bound and clamps below', () => {
            expect(getNumericGradientColor(0)).toBe('rgb(0, 153, 247)')
            expect(getNumericGradientColor(-1)).toBe('rgb(0, 153, 247)')
        })

        it('returns red at upper bound and clamps above', () => {
            expect(getNumericGradientColor(1)).toBe('rgb(241, 23, 18)')
            expect(getNumericGradientColor(2)).toBe('rgb(241, 23, 18)')
        })

        it('interpolates at 0.5', () => {
            expect(getNumericGradientColor(0.5)).toBe('rgb(121, 88, 133)')
        })
    })

    describe('assignDiscreteColors', () => {
        it('uses named surface colors when available', () => {
            const values = ['asphalt', 'gravel', 'dirt']
            const map = assignDiscreteColors('surface', values)
            expect(map.get('asphalt')).toBe(SURFACE_COLORS['asphalt'])
            expect(map.get('gravel')).toBe(SURFACE_COLORS['gravel'])
            expect(map.get('dirt')).toBe(SURFACE_COLORS['dirt'])
        })

        it('uses named road_class colors when available', () => {
            const values = ['motorway', 'cycleway']
            const map = assignDiscreteColors('road_class', values)
            expect(map.get('motorway')).toBe(ROAD_CLASS_COLORS['motorway'])
            expect(map.get('cycleway')).toBe(ROAD_CLASS_COLORS['cycleway'])
        })

        it('falls back to DISCRETE_PALETTE for unknown detail key', () => {
            const values = ['foo', 'bar', 'baz']
            const map = assignDiscreteColors('some_unknown_key', values)
            expect(map.get('foo')).toBe(DISCRETE_PALETTE[0])
            expect(map.get('bar')).toBe(DISCRETE_PALETTE[1])
            expect(map.get('baz')).toBe(DISCRETE_PALETTE[2])
        })

        it('assigns missing color for special values', () => {
            const values = ['missing', 'asphalt']
            const map = assignDiscreteColors('surface', values)
            expect(map.get('missing')).toBe('#dddddd')
            expect(map.get('asphalt')).toBe(SURFACE_COLORS['asphalt'])
        })

        it('does not duplicate entries', () => {
            const values = ['asphalt', 'asphalt', 'gravel']
            const map = assignDiscreteColors('surface', values)
            expect(map.size).toBe(2)
        })

        it('falls back to palette for unknown values within a known key', () => {
            const values = ['some_new_surface']
            const map = assignDiscreteColors('surface', values)
            expect(map.get('some_new_surface')).toBe(DISCRETE_PALETTE[0])
        })

        it('wraps palette when more values than palette length', () => {
            const values = Array.from({ length: 12 }, (_, i) => `val_${i}`)
            const map = assignDiscreteColors('unknown_key', values)
            expect(map.get('val_0')).toBe(DISCRETE_PALETTE[0])
            expect(map.get('val_9')).toBe(DISCRETE_PALETTE[0]) // wraps
        })
    })
})
