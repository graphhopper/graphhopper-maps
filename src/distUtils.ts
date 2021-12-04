import { Coordinate } from '@/stores/QueryStore'

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
                sinDeltaLat * sinDeltaLat + sinDeltaLon * sinDeltaLon * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
            )
        )
    )
}

export function toRad(deg: number): number {
    return deg * 0.017453292519943295
}
