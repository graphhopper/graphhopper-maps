import { Coordinate } from '@/stores/QueryStore'

/**
 * Finds the way-point that follows the part of a route that is closest to a given location
 *
 * @param routes one or more routes to be considered
 * @param location the location for which the closest route should be found
 */
export function findNextWayPoint(
    routes: { coordinates: Coordinate[]; wayPoints: Coordinate[] }[],
    location: Coordinate
): { closestRoute: number; nextWayPoint: number; distance: number } {
    if (
        routes.length < 1 ||
        routes.some(
            r => r.coordinates.length < 2 || r.wayPoints.length < 2 || r.wayPoints.length > r.coordinates.length
        )
    )
        throw new Error('Invalid input when trying to find the next way point')
    let minDistance = Number.MAX_VALUE
    let closestRoute = 0
    let nextWayPoint = 0
    routes.forEach((route, routeIndex) => {
        let wayPoint = 0
        route.coordinates.forEach(point => {
            if (calcDist(point, route.wayPoints[wayPoint]) < 1)
                wayPoint = Math.min(route.wayPoints.length - 1, wayPoint + 1)
            const distance = calcDist(point, location)
            if (distance < minDistance) {
                minDistance = distance
                closestRoute = routeIndex
                nextWayPoint = wayPoint == route.wayPoints.length ? wayPoint - 1 : wayPoint
            }
        })
    })
    return {
        closestRoute: closestRoute,
        nextWayPoint: nextWayPoint,
        distance: minDistance,
    }
}

/**
 * Calculates the great-circle distance between two points on Earth given the latitudes and longitudes
 * assuming that Earth is a sphere with radius 6371km. The result is returned in meters.
 */
function calcDist(point1: Coordinate, point2: Coordinate): number {
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

function toRad(deg: number): number {
    return deg * 0.017453292519943295
}
