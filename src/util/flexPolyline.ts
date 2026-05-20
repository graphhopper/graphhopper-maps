/*
 * Copyright (C) 2019 HERE Europe B.V.
 * Licensed under MIT, see full license in LICENSE
 * SPDX-License-Identifier: MIT
 * License-Filename: LICENSE
 *
 * Vendored verbatim (TypeScript-converted) from
 *   https://github.com/heremaps/flexible-polyline/blob/master/javascript/index.js
 * Algorithm bytes preserved unchanged. See /NOTICE.md for attribution.
 */

import { Coordinate } from '@/utils'

const DEFAULT_PRECISION = 5

const ENCODING_TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

const DECODING_TABLE = [
    62, -1, -1, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1, -1,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, -1, -1, -1, -1, 63, -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
    36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
]

const FORMAT_VERSION = 1

export const ABSENT = 0
export const LEVEL = 1
export const ALTITUDE = 2
export const ELEVATION = 3
// Reserved values 4 and 5 should not be selectable
export const CUSTOM1 = 6
export const CUSTOM2 = 7

// Use BigInt where available (modern browsers and Node) — keeps the algorithm
// identical to the upstream reference; Number fallback handles the rest.
const Num: any = typeof BigInt !== 'undefined' ? BigInt : Number

export interface DecodeResult {
    precision: number
    thirdDim: number
    thirdDimPrecision: number
    polyline: number[][]
}

export interface EncodeParams {
    precision?: number
    thirdDim?: number
    thirdDimPrecision?: number
    polyline: number[][]
}

export function decode(encoded: string): DecodeResult {
    const decoder = decodeUnsignedValues(encoded)
    const header = decodeHeader(decoder[0], decoder[1])

    const factorDegree = 10 ** header.precision
    const factorZ = 10 ** header.thirdDimPrecision
    const { thirdDim } = header

    let lastLat = 0
    let lastLng = 0
    let lastZ = 0
    const res: number[][] = []

    let i = 2
    for (; i < decoder.length; ) {
        const deltaLat = toSigned(decoder[i])
        const deltaLng = toSigned(decoder[i + 1])
        lastLat += deltaLat
        lastLng += deltaLng

        if (thirdDim) {
            const deltaZ = toSigned(decoder[i + 2])
            lastZ += deltaZ
            res.push([lastLat / factorDegree, lastLng / factorDegree, lastZ / factorZ])
            i += 3
        } else {
            res.push([lastLat / factorDegree, lastLng / factorDegree])
            i += 2
        }
    }

    if (i !== decoder.length) {
        throw new Error('Invalid encoding. Premature ending reached')
    }

    return {
        ...header,
        polyline: res,
    }
}

function decodeChar(char: string): number {
    const charCode = char.charCodeAt(0)
    return DECODING_TABLE[charCode - 45]
}

function decodeUnsignedValues(encoded: string): any[] {
    let result = Num(0)
    let shift = Num(0)
    const resList: any[] = []

    encoded.split('').forEach(char => {
        const value = Num(decodeChar(char))
        result |= (value & Num(0x1f)) << shift
        if ((value & Num(0x20)) === Num(0)) {
            resList.push(result)
            result = Num(0)
            shift = Num(0)
        } else {
            shift += Num(5)
        }
    })

    if (shift > 0) {
        throw new Error('Invalid encoding')
    }

    return resList
}

function decodeHeader(version: any, encodedHeader: any) {
    if (+version.toString() !== FORMAT_VERSION) {
        throw new Error('Invalid format version')
    }
    const headerNumber = +encodedHeader.toString()
    const precision = headerNumber & 15
    const thirdDim = (headerNumber >> 4) & 7
    const thirdDimPrecision = (headerNumber >> 7) & 15
    return { precision, thirdDim, thirdDimPrecision }
}

function toSigned(val: any): number {
    // Decode the sign from an unsigned value
    let res = val
    if (res & Num(1)) {
        res = ~res
    }
    res >>= Num(1)
    return +res.toString()
}

export function encode({
    precision = DEFAULT_PRECISION,
    thirdDim = ABSENT,
    thirdDimPrecision = 0,
    polyline,
}: EncodeParams): string {
    // Encode a sequence of lat,lng or lat,lng(,{third_dim}).
    //   `precision`: how many decimal digits of precision to store the latitude and longitude.
    //   `third_dim`: type of the third dimension if present in the input.
    //   `third_dim_precision`: how many decimal digits of precision to store the third dimension.

    const multiplierDegree = 10 ** precision
    const multiplierZ = 10 ** thirdDimPrecision
    const encodedHeaderList = encodeHeader(precision, thirdDim, thirdDimPrecision)
    const encodedCoords: string[] = []

    let lastLat = Num(0)
    let lastLng = Num(0)
    let lastZ = Num(0)
    polyline.forEach(location => {
        const lat = Num(Math.round(location[0] * multiplierDegree))
        encodedCoords.push(encodeScaledValue(lat - lastLat))
        lastLat = lat

        const lng = Num(Math.round(location[1] * multiplierDegree))
        encodedCoords.push(encodeScaledValue(lng - lastLng))
        lastLng = lng

        if (thirdDim) {
            const z = Num(Math.round(location[2] * multiplierZ))
            encodedCoords.push(encodeScaledValue(z - lastZ))
            lastZ = z
        }
    })

    return [...encodedHeaderList, ...encodedCoords].join('')
}

function encodeHeader(precision: number, thirdDim: number, thirdDimPrecision: number): string {
    // Encode the `precision`, `third_dim` and `third_dim_precision` into one encoded char
    if (precision < 0 || precision > 15) {
        throw new Error('precision out of range. Should be between 0 and 15')
    }
    if (thirdDimPrecision < 0 || thirdDimPrecision > 15) {
        throw new Error('thirdDimPrecision out of range. Should be between 0 and 15')
    }
    if (thirdDim < 0 || thirdDim > 7 || thirdDim === 4 || thirdDim === 5) {
        throw new Error('thirdDim should be between 0, 1, 2, 3, 6 or 7')
    }

    const res = (thirdDimPrecision << 7) | (thirdDim << 4) | precision
    return encodeUnsignedNumber(FORMAT_VERSION) + encodeUnsignedNumber(res)
}

function encodeUnsignedNumber(val: any): string {
    // Uses variable integer encoding to encode an unsigned integer. Returns the encoded string.
    let res = ''
    let numVal = Num(val)
    while (numVal > 0x1f) {
        const pos = (numVal & Num(0x1f)) | Num(0x20)
        res += ENCODING_TABLE[Number(pos)]
        numVal >>= Num(5)
    }
    return res + ENCODING_TABLE[Number(numVal)]
}

function encodeScaledValue(value: any): string {
    // Transform a integer `value` into a variable length sequence of characters.
    let numVal = Num(value)
    const negative = numVal < 0
    numVal <<= Num(1)
    if (negative) {
        numVal = ~numVal
    }

    return encodeUnsignedNumber(numVal)
}

// ---------------------------------------------------------------------------
// Thin wrappers for the GraphHopper Maps codebase:
// convert between HERE's [lat, lng] tuples and our Coordinate { lat, lng }.

// Default precision for share URLs — matches the rest of the codebase
// (coordinateToText rounds to 1e-6; API uses points_encoded_multiplier 1e6).
export const WAYPOINT_PRECISION = 6

export function encodeCoords(coords: Coordinate[], precision = WAYPOINT_PRECISION): string {
    return encode({
        precision,
        polyline: coords.map(c => [c.lat, c.lng]),
    })
}

export function decodeCoords(encoded: string): Coordinate[] {
    return decode(encoded).polyline.map(([lat, lng]) => ({ lat, lng }))
}
