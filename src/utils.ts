import { ProfileGroup } from 'config'
import { Bbox } from '@/api/graphhopper'

export class ProfileGroupMap {
    public static create(map: Record<string, ProfileGroup>): Record<string, string> {
        let res: Record<string, string> = {}
        if (map)
            for (const [key, value] of Object.entries(map)) {
                for (const option of value.options) {
                    res[option.profile] = key
                }
            }
        return res
    }
}

export interface Coordinate {
    lat: number
    lng: number
}

export function getBBoxFromCoord(c: Coordinate, offset: number = 0.005): Bbox {
    return [c.lng - offset, c.lat - offset, c.lng + offset, c.lat + offset]
}

// TODO merge with toBBox in RoutingResults
export function getBBoxPoints(points: Coordinate[]): Bbox | null {
    const bbox: Bbox = points.reduce(
        (res: Bbox, c) => [
            Math.min(res[0], c.lng),
            Math.min(res[1], c.lat),
            Math.max(res[2], c.lng),
            Math.max(res[3], c.lat),
        ],
        [180, 90, -180, -90] as Bbox,
    )
    if (points.length == 1) {
        bbox[0] = bbox[0] - 0.001
        bbox[1] = bbox[1] - 0.001
        bbox[2] = bbox[2] + 0.001
        bbox[3] = bbox[3] + 0.001
    }

    // return null if the bbox is not valid, e.g. if no url points were given at all
    return bbox[0] < bbox[2] && bbox[1] < bbox[3] ? bbox : null
}
export interface CustomModel {
    readonly speed?: object[]
    readonly priority?: object[]
    readonly distance_influence?: number
    readonly areas?: object
}

/**
 * Calculates the great-circle distance between two points on Earth given the latitudes and longitudes
 * assuming that Earth is a sphere with radius 6371km. The result is returned in meters.
 */
export function calcDist(point1: Coordinate, point2: Coordinate): number {
    const lat1 = point1.lat
    const lat2 = point2.lat
    const lon1 = point1.lng
    const lon2 = point2.lng
    const sinDeltaLat = Math.sin(toRad(lat2 - lat1) / 2)
    const sinDeltaLon = Math.sin(toRad(lon2 - lon1) / 2)
    return (
        6371000 *
        2 *
        Math.asin(
            Math.sqrt(
                sinDeltaLat * sinDeltaLat + sinDeltaLon * sinDeltaLon * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)),
            ),
        )
    )
}

export function toRad(deg: number): number {
    return deg * 0.017453292519943295
}
