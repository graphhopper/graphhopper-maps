import { ChartData, ChartPathDetail, ElevationPoint, LegendEntry, PathDetailSegment } from './types'
import { assignDiscreteColors, getNumericGradientColor, getSpeedColor, getSpeedLabels, getSpeedThresholds, getSlopeColor, SPEED_COLORS, INCLINE_CATEGORIES } from './colors'

export interface PathLike {
    points: { coordinates: number[][] }
    snapped_waypoints: { coordinates: number[][] }
    // type is: { [key: string]: [number, number, any][] } -> simpler regarding TS, but then explicit cast necessary
    details: object
    distance: number
}

/**
 * Equirectangular plane projection distance between two [lng, lat] points in meters.
 * Consistent with GraphHopper's DistancePlaneProjection (see graphhopper#3296).
 * For now do not use calcDist from utils.ts to make it easy to separate this from GH Maps.
 */
function planeDist(p: number[], q: number[]): number {
    const toRad = (deg: number) => deg * 0.017453292519943295
    const dLat = toRad(q[1] - p[1])
    const dLon = toRad(q[0] - p[0])
    const x = Math.cos(toRad((p[1] + q[1]) / 2)) * dLon
    return 6371000 * Math.sqrt(dLat * dLat + x * x)
}

export function extractElevationPoints(coordinates: number[][]): ElevationPoint[] {
    if (coordinates.length === 0) return []
    const has3D = coordinates[0].length >= 3
    const points: ElevationPoint[] = []
    let cumDist = 0
    for (let i = 0; i < coordinates.length; i++) {
        if (has3D && coordinates[i].length < 3)
            throw new Error(`Coordinate at index ${i} is 2D but first coordinate is 3D`)
        if (i > 0) cumDist += planeDist(coordinates[i - 1], coordinates[i])
        points.push({
            distance: cumDist,
            elevation: has3D ? coordinates[i][2] : 0,
            lng: coordinates[i][0],
            lat: coordinates[i][1],
        })
    }
    return points
}

export function calculateViaPointDistances(
    path: PathLike,
): number[] {
    const coords = path.points.coordinates
    if (coords.length === 0) return []

    // Build cumulative distances
    const cumDist: number[] = [0]
    for (let i = 1; i < coords.length; i++) {
        cumDist.push(cumDist[i - 1] + planeDist(coords[i - 1], coords[i]))
    }

    // snapped_waypoints has coordinates for all query points (From, Vias, To)
    // We want only via points (skip first=From and last=To)
    const waypointCoords = path.snapped_waypoints.coordinates
    if (waypointCoords.length <= 2) return []

    const viaDistances: number[] = []
    let searchFrom = 0
    for (let w = 1; w < waypointCoords.length - 1; w++) {
        const wp = waypointCoords[w]
        // Find closest point on route, starting from previous match
        // since waypoints are ordered along the route
        let minDist = Infinity
        let bestIdx = searchFrom
        for (let i = searchFrom; i < coords.length; i++) {
            const d = planeDist(coords[i], wp)
            if (d < minDist) {
                minDist = d
                bestIdx = i
            }
        }
        viaDistances.push(cumDist[bestIdx])
        searchFrom = bestIdx
    }
    return viaDistances
}

function inspectDetail(entries: [number, number, any][]): {
    numeric: boolean
    minVal: number
    maxVal: number
} {
    let minVal = Infinity
    let maxVal = -Infinity
    let numberCount = 0
    let nonNullCount = 0
    for (const entry of entries) {
        const val = entry[2]
        if (val == null) continue
        nonNullCount++
        if (typeof val === 'number' && isFinite(val)) {
            numberCount++
            minVal = Math.min(val, minVal)
            maxVal = Math.max(val, maxVal)
        }
    }
    return {
        numeric: numberCount === nonNullCount && numberCount > 0,
        minVal: minVal === Infinity ? 0 : minVal,
        maxVal: maxVal === -Infinity ? 0 : maxVal,
    }
}

function detectVisualizationType(entries: [number, number, any][]): 'area' | 'bars' | 'line' {
    const info = inspectDetail(entries)
    return info.numeric && info.minVal !== info.maxVal ? 'line' : 'bars'
}

export function sanitizeNumericValues(
    entries: [number, number, any][],
): [number, number, any][] {
    // Cap Infinity values at 99th percentile
    const finiteVals = entries.map(e => e[2]).filter((v): v is number => typeof v === 'number' && isFinite(v))
    if (finiteVals.length === 0) return entries

    finiteVals.sort((a, b) => a - b)
    const p99 = finiteVals[Math.floor(finiteVals.length * 0.99)]

    return entries.map(([from, to, val]) => {
        if (val == null) return [from, to, 0]
        if (typeof val === 'number' && !isFinite(val)) return [from, to, p99]
        return [from, to, val]
    })
}

export function transformPathDetail(
    key: string,
    label: string,
    entries: [number, number, any][],
    coordinates: number[][],
    cumulativeDistances: number[],
    profile: string = '',
): ChartPathDetail {
    const sanitized = sanitizeNumericValues(entries)
    const type = detectVisualizationType(sanitized)
    const info = inspectDetail(sanitized)

    const isSpeedDetail = key === 'average_speed' || key === 'max_speed'

    let segments: PathDetailSegment[]
    let legend: LegendEntry[]

    if (type === 'line' && isSpeedDetail) {
        // Speed values - use profile-specific discrete bucket colors
        const thresholds = getSpeedThresholds(profile)
        segments = sanitized.map(([from, to, val]) => ({
            fromDistance: cumulativeDistances[from] || 0,
            toDistance: cumulativeDistances[to] || 0,
            value: val,
            color: getSpeedColor(val, thresholds),
            coordinates: coordinates.slice(from, to + 1).map(c => [c[0], c[1]] as [number, number]),
        }))
        const labels = getSpeedLabels(thresholds)
        legend = labels.map((lbl, i) => ({
            label: lbl,
            color: SPEED_COLORS[Math.min(i, SPEED_COLORS.length - 1)],
        }))
    } else if (type === 'line') {
        // Other numeric values - use gradient coloring
        segments = sanitized.map(([from, to, val]) => {
            const factor = info.maxVal !== info.minVal ? (val - info.minVal) / (info.maxVal - info.minVal) : 0
            return {
                fromDistance: cumulativeDistances[from] || 0,
                toDistance: cumulativeDistances[to] || 0,
                value: val,
                color: getNumericGradientColor(factor),
                coordinates: coordinates.slice(from, to + 1).map(c => [c[0], c[1]] as [number, number]),
            }
        })
        const mid = Math.round((info.minVal + info.maxVal) / 2)
        legend = [
            { label: String(info.minVal), color: getNumericGradientColor(0) },
            { label: String(mid), color: getNumericGradientColor(0.5) },
            { label: String(info.maxVal), color: getNumericGradientColor(1) },
        ]
    } else {
        // Discrete values
        const allValues = sanitized.map(e => e[2])
        const colorMap = assignDiscreteColors(key, allValues)

        segments = sanitized.map(([from, to, val]) => ({
            fromDistance: cumulativeDistances[from] || 0,
            toDistance: cumulativeDistances[to] || 0,
            value: val ?? 'Undefined',
            color: colorMap.get(String(val ?? 'Undefined')) || '#dddddd',
            coordinates: coordinates.slice(from, to + 1).map(c => [c[0], c[1]] as [number, number]),
        }))

        // Build legend from unique values preserving order
        const seen = new Set<string>()
        legend = []
        for (const [, , val] of sanitized) {
            const str = String(val ?? 'Undefined')
            if (!seen.has(str)) {
                seen.add(str)
                legend.push({ label: str, color: colorMap.get(str) || '#dddddd' })
            }
        }
    }

    return {
        key,
        label,
        type,
        segments,
        legend,
        minValue: type === 'line' ? info.minVal : undefined,
        maxValue: type === 'line' ? info.maxVal : undefined,
        unit: isSpeedDetail ? 'km/h' : undefined,
    }
}

//Called once per route selection
export function buildChartData(
    selectedPath: PathLike,
    alternativePaths: PathLike[],
    translateFn: (key: string) => string,
    profile: string = '',
): ChartData {
    const raw = selectedPath.points.coordinates
    const needs3D = raw.length > 0 && raw[0].length === 2
    const coordinates = needs3D ? raw.map(pos => [pos[0], pos[1], 0]) : raw

    const elevation = extractElevationPoints(coordinates)

    // Build cumulative distances array for index-based lookups
    const cumulativeDistances: number[] = elevation.map(p => p.distance)

    // Alternative elevations
    const alternativeElevations = alternativePaths
        .filter(p => p !== selectedPath && p.points.coordinates.length > 0)
        .map(p => {
            const altRaw = p.points.coordinates
            const altCoords = altRaw.length > 0 && altRaw[0].length === 2 ? altRaw.map(pos => [pos[0], pos[1], 0]) : altRaw
            return extractElevationPoints(altCoords)
        })

    // Path details
    const pathDetails: ChartPathDetail[] = []
    const details = selectedPath.details as { [key: string]: [number, number, any][] }
    for (const [key, entries] of Object.entries(details)) {
        if (!entries || entries.length === 0) continue
        pathDetails.push(
            transformPathDetail(key, translateFn(key), entries, coordinates, cumulativeDistances, profile),
        )
    }

    // Via point distances
    const viaPointDistances = calculateViaPointDistances(selectedPath)

    return {
        elevation,
        alternativeElevations,
        pathDetails,
        viaPointDistances,
        totalDistance: selectedPath.distance,
    }
}

// Generates a synthetic ChartPathDetail from the elevation data to be used for route colors on map
export function buildInclineDetail(elevation: ElevationPoint[]): ChartPathDetail {
    const legend = INCLINE_CATEGORIES.map(c => ({ label: c.label, color: c.color }))

    if (elevation.length < 2) {
        return { key: '_incline', label: 'Incline', type: 'bars', segments: [], legend }
    }

    // Compute slope between consecutive points and assign incline colors
    const raw: PathDetailSegment[] = []
    for (let i = 0; i < elevation.length - 1; i++) {
        const p = elevation[i]
        const q = elevation[i + 1]
        const dist = q.distance - p.distance
        const slopePercent = dist > 0 ? ((q.elevation - p.elevation) / dist) * 100 : 0
        const color = getSlopeColor(slopePercent)
        raw.push({
            fromDistance: p.distance,
            toDistance: q.distance,
            value: Math.round(Math.abs(slopePercent) * 10) / 10,
            color,
            coordinates: [[p.lng, p.lat], [q.lng, q.lat]],
        })
    }

    // Merge consecutive segments with the same color for cleaner map rendering
    const segments: PathDetailSegment[] = []
    for (const seg of raw) {
        const last = segments[segments.length - 1]
        if (last && last.color === seg.color) {
            last.toDistance = seg.toDistance
            last.coordinates.push(seg.coordinates[seg.coordinates.length - 1])
        } else {
            segments.push({ ...seg, coordinates: [...seg.coordinates] })
        }
    }

    return { key: '_incline', label: 'Incline', type: 'bars', segments, legend }
}
