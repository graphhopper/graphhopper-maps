import { Instruction, Path } from '@/api/graphhopper'
import { Coordinate } from '@/stores/QueryStore'
import { or } from 'ol/format/filter'

export function getCurrentDetails(path: Path, location: Coordinate, details: [any, any, any][][]): any[] {
    let smallestDist = Number.MAX_VALUE
    const points = path.points.coordinates
    let foundIndex = -1

    for (let pIdx = 0; pIdx < points.length; pIdx++) {
        const p: number[] = points[pIdx]
        let snapped = { lat: p[1], lng: p[0] }
        let dist = distCalc(p[1], p[0], location.lat, location.lng)

        if (pIdx + 1 < points.length) {
            const next: number[] = points[pIdx + 1]
            if (validEdgeDistance(location.lat, location.lng, p[1], p[0], next[1], next[0])) {
                snapped = calcCrossingPointToEdge(location.lat, location.lng, p[1], p[0], next[1], next[0])
                dist = Math.min(dist, distCalc(snapped.lat, snapped.lng, location.lat, location.lng))
            }
        }

        if (dist < smallestDist) {
            smallestDist = dist
            foundIndex = pIdx
        }
    }
    if (foundIndex < 0) return []

    let result = []
    for (let i = 0; i < details.length; i++) {
        let detailOnPath = details[i]
        for (let d = 0; d < detailOnPath.length; d++) {
            let [from, to, val] = detailOnPath[d]
            if ((foundIndex >= from && foundIndex < to) || (foundIndex == to && d + 1 == detailOnPath.length)) {
                result.push(val)
                break
            }
        }
    }

    return result
}

export function getCurrentInstruction(
    instructions: Instruction[],
    location: Coordinate
): {
    instructionIndex: number
    timeToNext: number
    distanceToNext: number
    distanceToRoute: number
    remainingTime: number
    remainingDistance: number
    nextWaypointIndex: number
} {
    let instructionIndex = -1
    let distanceToRoute = Number.MAX_VALUE
    let distanceToNext = 10.0
    let nextWaypointIndex = 0
    let waypointIndex = 0

    for (let instrIdx = 0; instrIdx < instructions.length; instrIdx++) {
        const sign = instructions[instrIdx].sign
        if (sign === 4 || sign === 5) waypointIndex++
        const points: number[][] = instructions[instrIdx].points

        for (let pIdx = 0; pIdx < points.length; pIdx++) {
            const p: number[] = points[pIdx]
            let snapped = { lat: p[1], lng: p[0] }
            let dist = distCalc(p[1], p[0], location.lat, location.lng)
            // calculate the snapped point, TODO use first point of next instruction for "next" if last point of current instruction
            if (pIdx + 1 < points.length) {
                const next: number[] = points[pIdx + 1]
                if (validEdgeDistance(location.lat, location.lng, p[1], p[0], next[1], next[0])) {
                    snapped = calcCrossingPointToEdge(location.lat, location.lng, p[1], p[0], next[1], next[0])
                    dist = Math.min(dist, distCalc(snapped.lat, snapped.lng, location.lat, location.lng))
                }
            }

            if (dist < distanceToRoute) {
                distanceToRoute = dist
                // use next instruction or finish
                instructionIndex = instrIdx + 1 < instructions.length ? instrIdx + 1 : instrIdx
                const last: number[] = points[points.length - 1]
                distanceToNext = Math.round(distCalc(last[1], last[0], snapped.lat, snapped.lng))
                nextWaypointIndex = waypointIndex + 1
            }
        }
    }

    let timeToNext = 0
    let remainingTime = 0
    let remainingDistance = distanceToNext
    if (instructionIndex >= 0) {
        if (instructionIndex > 0) {
            // proportional estimate the time to the next instruction, TODO use time from path details instead
            let prevInstruction = instructions[instructionIndex - 1]
            timeToNext =
                prevInstruction.distance > 0 ? prevInstruction.time * (distanceToNext / prevInstruction.distance) : 0
            // console.log('time: ' + prevInstruction.time + ', ' + distanceToNext + ', ' + prevInstruction.distance)
        }
        remainingTime = timeToNext
        remainingDistance = distanceToNext
        for (let instrIdx = instructionIndex; instrIdx < instructions.length; instrIdx++) {
            remainingTime += instructions[instrIdx].time
            remainingDistance += instructions[instrIdx].distance
        }
    }

    return {
        instructionIndex,
        timeToNext,
        distanceToNext,
        distanceToRoute,
        remainingTime,
        remainingDistance,
        nextWaypointIndex,
    }
}

export function distCalc(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    const sinDeltaLat: number = Math.sin(toRadians(toLat - fromLat) / 2)
    const sinDeltaLon: number = Math.sin(toRadians(toLng - fromLng) / 2)
    const normedDist: number =
        sinDeltaLat * sinDeltaLat +
        sinDeltaLon * sinDeltaLon * Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat))
    return 6371000 * 2 * Math.asin(Math.sqrt(normedDist))
}

function validEdgeDistance(
    r_lat_deg: number,
    r_lon_deg: number,
    a_lat_deg: number,
    a_lon_deg: number,
    b_lat_deg: number,
    b_lon_deg: number
): boolean {
    let shrinkFactor = calcShrinkFactor(a_lat_deg, b_lat_deg)
    let a_lat = a_lat_deg
    let a_lon = a_lon_deg * shrinkFactor

    let b_lat = b_lat_deg
    let b_lon = b_lon_deg * shrinkFactor

    let r_lat = r_lat_deg
    let r_lon = r_lon_deg * shrinkFactor

    let ar_x = r_lon - a_lon
    let ar_y = r_lat - a_lat
    let ab_x = b_lon - a_lon
    let ab_y = b_lat - a_lat
    let ab_ar = ar_x * ab_x + ar_y * ab_y

    let rb_x = b_lon - r_lon
    let rb_y = b_lat - r_lat
    let ab_rb = rb_x * ab_x + rb_y * ab_y

    // calculate the exact degree alpha(ar, ab) and beta(rb,ab) if it is case 1 then both angles are <= 90°
    // double ab_ar_norm = Math.sqrt(ar_x * ar_x + ar_y * ar_y) * Math.sqrt(ab_x * ab_x + ab_y * ab_y);
    // double ab_rb_norm = Math.sqrt(rb_x * rb_x + rb_y * rb_y) * Math.sqrt(ab_x * ab_x + ab_y * ab_y);
    // return Math.acos(ab_ar / ab_ar_norm) <= Math.PI / 2 && Math.acos(ab_rb / ab_rb_norm) <= Math.PI / 2;
    return ab_ar > 0 && ab_rb > 0
}

function calcShrinkFactor(a_lat_deg: number, b_lat_deg: number): number {
    return Math.cos(toRadians((a_lat_deg + b_lat_deg) / 2))
}

function calcCrossingPointToEdge(
    r_lat_deg: number,
    r_lon_deg: number,
    a_lat_deg: number,
    a_lon_deg: number,
    b_lat_deg: number,
    b_lon_deg: number
): Coordinate {
    let shrinkFactor = calcShrinkFactor(a_lat_deg, b_lat_deg)
    let a_lat = a_lat_deg
    let a_lon = a_lon_deg * shrinkFactor

    let b_lat = b_lat_deg
    let b_lon = b_lon_deg * shrinkFactor

    let r_lat = r_lat_deg
    let r_lon = r_lon_deg * shrinkFactor

    let delta_lon = b_lon - a_lon
    let delta_lat = b_lat - a_lat

    if (delta_lat == 0)
        // special case: horizontal edge
        return { lat: a_lat_deg, lng: r_lon_deg }

    if (delta_lon == 0)
        // special case: vertical edge
        return { lat: r_lat_deg, lng: a_lon_deg }

    let norm = delta_lon * delta_lon + delta_lat * delta_lat
    let factor = ((r_lon - a_lon) * delta_lon + (r_lat - a_lat) * delta_lat) / norm

    // x,y is projection of r onto segment a-b
    let c_lon = a_lon + factor * delta_lon
    let c_lat = a_lat + factor * delta_lat
    return { lat: c_lat, lng: c_lon / shrinkFactor }
}

// returns orientation in interval -pi to +pi where 0 is east
export function calcOrientation(lat1: number, lon1: number, lat2: number, lon2: number): number {
    let shrinkFactor = Math.cos(toRadians((lat1 + lat2) / 2))
    return Math.atan2(lat2 - lat1, shrinkFactor * (lon2 - lon1))
}

// convert east-based radians into north based
export function toNorthBased(orientation: number): number {
    orientation = orientation >= 0 ? (5 * Math.PI) / 2 - orientation : Math.PI / 2 - orientation
    // modulo with decimals seems to work too!? orientation % (2 * Math.PI)
    return orientation > 2 * Math.PI ? orientation - 2 * Math.PI : orientation
}

export function toDegrees(rad: number): number {
    return (rad * 180.0) / Math.PI
}

export function toRadians(deg: number): number {
    return (deg * Math.PI) / 180.0
}
