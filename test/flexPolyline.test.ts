import { decode, decodeCoords, encode, encodeCoords, WAYPOINT_PRECISION } from '@/util/flexPolyline'

// Canonical test vector from HERE's reference README:
//   https://github.com/heremaps/flexible-polyline
// Ensures bit-exact compatibility with the upstream reference implementation.
const REFERENCE_INPUT: number[][] = [
    [50.1022829, 8.6982122],
    [50.1020076, 8.6956695],
    [50.1006313, 8.691496],
    [50.0987800, 8.6875156],
]
const REFERENCE_OUTPUT = 'BFoz5xJ67i1B1B7PzIhaxL7Y'

describe('flexPolyline (HERE reference)', () => {
    it('encodes the canonical README example bit-exactly', () => {
        const encoded = encode({ precision: 5, polyline: REFERENCE_INPUT })
        expect(encoded).toEqual(REFERENCE_OUTPUT)
    })

    it('decodes the canonical README example bit-exactly', () => {
        const decoded = decode(REFERENCE_OUTPUT)
        expect(decoded.precision).toEqual(5)
        expect(decoded.thirdDim).toEqual(0)
        for (let i = 0; i < REFERENCE_INPUT.length; i++) {
            expect(decoded.polyline[i][0]).toBeCloseTo(REFERENCE_INPUT[i][0], 5)
            expect(decoded.polyline[i][1]).toBeCloseTo(REFERENCE_INPUT[i][1], 5)
        }
    })
})

describe('flexPolyline Coordinate wrapper', () => {
    it('roundtrips Coordinate arrays losslessly at precision 6', () => {
        const coords = [
            { lat: 51.106229, lng: 13.679849 },
            { lat: 51.049329, lng: 13.738144 },
            { lat: 55.72172, lng: 21.950163 },
            { lat: -33.86882, lng: 151.20929 },
        ]
        const encoded = encodeCoords(coords)
        const decoded = decodeCoords(encoded)
        expect(decoded.length).toEqual(coords.length)
        for (let i = 0; i < coords.length; i++) {
            expect(decoded[i].lat).toBeCloseTo(coords[i].lat, 6)
            expect(decoded[i].lng).toBeCloseTo(coords[i].lng, 6)
        }
    })

    it('uses precision 6 by default (matches coordinateToText precision)', () => {
        const coords = [{ lat: 51.123456, lng: 13.987654 }]
        const encoded = encodeCoords(coords)
        // Decoded header should carry precision 6
        expect(decode(encoded).precision).toEqual(WAYPOINT_PRECISION)
    })

    it('produces a URL-safe string (only A-Za-z0-9_- chars)', () => {
        const coords = [
            { lat: 51.106229, lng: 13.679849 },
            { lat: 51.049329, lng: 13.738144 },
        ]
        const encoded = encodeCoords(coords)
        expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    })
})
