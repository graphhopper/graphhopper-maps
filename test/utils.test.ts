import { getBBoxFromExtent, getBBoxPoints } from '@/utils'

describe('getBBoxPoints', () => {
    it('returns the bbox of the given points', () => {
        expect(
            getBBoxPoints([
                { lat: 64.14, lng: -21.9 },
                { lat: 53.35, lng: -6.26 },
            ]),
        ).toEqual([-21.9, 53.35, -6.26, 64.14])
    })

    it('wraps around the antimeridian if the points are closer that way, see #306', () => {
        expect(
            getBBoxPoints([
                { lat: 68.95933, lng: 179.993481 },
                { lat: 68.954544, lng: -179.954919 },
            ]),
        ).toEqual([179.993481, 68.954544, -179.954919 + 360, 68.95933])
    })

    it('wraps around the antimeridian for multiple points if that yields the smaller bbox', () => {
        expect(
            getBBoxPoints([
                { lat: 0, lng: -170 },
                { lat: 0, lng: 0 },
                { lat: 1, lng: 170 },
            ]),
        ).toEqual([0, 0, 190, 1])
    })
})

describe('getBBoxFromExtent', () => {
    it('is symmetric around the point and ignores exclaves', () => {
        const c = { lng: 10.0, lat: 53.55 }
        const close = (bbox: number[], exp: number[]) => bbox.forEach((v, i) => expect(v).toBeCloseTo(exp[i], 6))
        close(getBBoxFromExtent(c), [9.995, 53.545, 10.005, 53.555])
        // tiny extent -> minimum size
        close(getBBoxFromExtent(c, [9.999, 53.549, 10.001, 53.551]), [9.995, 53.545, 10.005, 53.555])
        // Hamburg incl. Neuwerk
        close(getBBoxFromExtent(c, [8.1, 53.4, 10.3, 54.0]), [9.7, 53.4, 10.3, 53.7])
    })
})
