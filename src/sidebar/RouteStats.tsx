import React from 'react'
import { Path } from '@/api/graphhopper'
import { Position } from 'geojson'
import { calcDist } from '@/utils'
import { ApiImpl } from '@/api/Api'
import styles from './RouteStats.module.css'

const PAVED_SURFACES = new Set([
    'asphalt', 'concrete', 'paved', 'paving_stones', 'concrete:plates', 'concrete:lanes', 'metal',
])
const UNPAVED_SURFACES = new Set([
    'unpaved', 'gravel', 'dirt', 'grass', 'sand', 'ground', 'earth', 'mud', 'wood', 'compacted', 'fine_gravel', 'grass_paver',
    'cobblestone', 'sett', 'unhewn_cobblestone',
])

const BIG_ROADS = new Set(['primary', 'secondary', 'trunk', 'motorway'])
const MEDIUM_ROADS = new Set(['tertiary', 'residential', 'unclassified', 'living_street', 'service'])
const SMALL_ROADS = new Set(['cycleway', 'path', 'track', 'bridleway'])

const BN_KEYS = ['international', 'national', 'regional', 'local'] as const
const FN_KEYS = ['international', 'national', 'regional', 'local'] as const

function calcSegmentDist(coords: Position[], from: number, to: number): number {
    let dist = 0
    for (let i = from; i < to; i++) {
        dist += calcDist({ lat: coords[i][1], lng: coords[i][0] }, { lat: coords[i + 1][1], lng: coords[i + 1][0] })
    }
    return dist
}

function computeDetailDistances(coords: Position[], details: [number, number, any][] | undefined): Map<string, number> {
    const distances = new Map<string, number>()
    if (!details) return distances
    for (const [from, to, value] of details) {
        const key = value != null ? String(value) : ''
        const dist = calcSegmentDist(coords, from, to)
        distances.set(key, (distances.get(key) || 0) + dist)
    }
    return distances
}

function computeInclineDistances(coords: Position[], thresholds: number[]): number[] {
    const distAbove = thresholds.map(() => 0)
    if (coords.length < 2 || coords[0].length < 3) return distAbove

    let segDist = 0
    let prevElePoint = coords[0]
    let prevDistPoint = coords[0]

    for (let i = 1; i < coords.length; i++) {
        const curr = coords[i]
        segDist += calcDist({ lat: prevDistPoint[1], lng: prevDistPoint[0] }, { lat: curr[1], lng: curr[0] })
        prevDistPoint = curr
        // smooth over ~100m to reduce elevation noise
        if (segDist > 100) {
            const slope = (100 * Math.abs(curr[2] - prevElePoint[2])) / segDist
            for (let t = 0; t < thresholds.length; t++) {
                if (slope >= thresholds[t]) {
                    distAbove[t] += segDist
                }
            }
            prevElePoint = curr
            segDist = 0
        }
    }
    return distAbove
}

function computeSpeedDistances(
    coords: Position[],
    details: [number, number, number][] | undefined,
    thresholds: number[],
): number[] {
    const distBelow = thresholds.map(() => 0)
    if (!details) return distBelow
    for (const [from, to, speed] of details) {
        const dist = calcSegmentDist(coords, from, to)
        for (let t = 0; t < thresholds.length; t++) {
            if (speed < thresholds[t]) {
                distBelow[t] += dist
            }
        }
    }
    return distBelow
}

function sumForKeys(distances: Map<string, number>, keys: Iterable<string>): number {
    let total = 0
    for (const key of keys) {
        total += distances.get(key) || 0
    }
    return total
}

function pct(value: number, total: number): number {
    if (total <= 0) return 0
    return Math.round((100 * value) / total)
}

function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    if (m === 60) return h + 1 + ' h'
    if (h > 0) return `${h} h ${m} min`
    return `${m} min`
}

function getSpeedThresholds(profile: string): number[] {
    if (ApiImpl.isMotorVehicle(profile)) return [30, 50, 80]
    if (ApiImpl.isFootLike(profile)) return [3, 4, 5]
    return [5, 10, 15, 20]
}

export default function RouteStats({
    path,
    profile,
    showDistanceInMiles,
}: {
    path: Path
    profile: string
    showDistanceInMiles: boolean
}) {
    const coords = path.points.coordinates
    const totalDist = path.distance

    if (totalDist <= 0) return null

    const lines: React.ReactNode[] = []

    // Surface stats (all profiles)
    if (path.details.surface) {
        const surfaceDist = computeDetailDistances(coords, path.details.surface)
        const paved = sumForKeys(surfaceDist, PAVED_SURFACES)
        const unpaved = sumForKeys(surfaceDist, UNPAVED_SURFACES)
        const missing = Math.max(0, totalDist - paved - unpaved)

        const parts: string[] = []
        if (paved > 0) parts.push(`${pct(paved, totalDist)}% paved`)
        if (unpaved > 0) parts.push(`${pct(unpaved, totalDist)}% unpaved`)
        if (missing > 0) parts.push(`${pct(missing, totalDist)}% missing`)

        if (parts.length > 0) {
            lines.push(
                <div key="surface">
                    <span className={styles.label}>Surface: </span>
                    {parts.join(', ')}
                </div>,
            )
        }
    }

    // Bike network stats (bike profiles only)
    if (ApiImpl.isBikeLike(profile) && path.details.bike_network) {
        const bnDist = computeDetailDistances(coords, path.details.bike_network)
        const onNetwork = sumForKeys(bnDist, BN_KEYS)
        const onPct = pct(onNetwork, totalDist)

        const parts: string[] = [`${onPct}% total`]
        for (const key of BN_KEYS) {
            const d = bnDist.get(key) || 0
            if (d > 0) {
                parts.push(`${pct(d, totalDist)}% ${key}`)
            }
        }

        lines.push(
            <div key="bike_network">
                <span className={styles.label}>Bike network: </span>
                {parts.join(', ')}
            </div>,
        )
    }

    // Foot network stats (foot profiles only)
    if (ApiImpl.isFootLike(profile) && path.details.foot_network) {
        const fnDist = computeDetailDistances(coords, path.details.foot_network)
        const onNetwork = sumForKeys(fnDist, FN_KEYS)
        const onPct = pct(onNetwork, totalDist)

        const parts: string[] = [`${onPct}% total`]
        for (const key of FN_KEYS) {
            const d = fnDist.get(key) || 0
            if (d > 0) {
                parts.push(`${pct(d, totalDist)}% ${key}`)
            }
        }

        lines.push(
            <div key="foot_network">
                <span className={styles.label}>Foot network: </span>
                {parts.join(', ')}
            </div>,
        )
    }

    // Road class stats
    if (path.details.road_class) {
        const roadDist = computeDetailDistances(coords, path.details.road_class)
        const big = sumForKeys(roadDist, BIG_ROADS)
        const medium = sumForKeys(roadDist, MEDIUM_ROADS)
        const small = sumForKeys(roadDist, SMALL_ROADS)

        const parts: string[] = []
        if (big > 0) parts.push(`${pct(big, totalDist)}% big`)
        if (medium > 0) parts.push(`${pct(medium, totalDist)}% medium`)
        if (small > 0) parts.push(`${pct(small, totalDist)}% small`)

        if (parts.length > 0) {
            lines.push(
                <div key="road_class">
                    <span className={styles.label}>Roads: </span>
                    {parts.join(', ')}
                </div>,
            )
        }

        // Steps (bike and foot)
        if (!ApiImpl.isMotorVehicle(profile)) {
            const steps = roadDist.get('steps') || 0
            if (steps > 0) {
                lines.push(
                    <div key="steps">
                        <span className={styles.label}>Steps: </span>
                        {pct(steps, totalDist)}% ({Math.round(steps)} m)
                    </div>,
                )
            }

            const footways = (roadDist.get('footway') || 0) + (roadDist.get('pedestrian') || 0)
            if (footways > 0) {
                lines.push(
                    <div key="footways">
                        <span className={styles.label}>Footway/pedestrian: </span>
                        {pct(footways, totalDist)}%
                    </div>,
                )
            }
        }
    }

    // Incline stats from 3D coordinates (all profiles when elevation available)
    if (coords.length > 1 && coords[0].length >= 3) {
        const thresholds = [4, 8, 12]
        const names = ['mild (≥4%)', 'steep (≥8%)', 'very steep (≥12%)']
        const distAbove = computeInclineDistances(coords, thresholds)

        const parts: string[] = []
        for (let i = 0; i < thresholds.length; i++) {
            if (distAbove[i] > 0) parts.push(`${pct(distAbove[i], totalDist)}% ${names[i]}`)
        }

        if (parts.length > 0) {
            lines.push(
                <div key="incline">
                    <span className={styles.label}>Incline: </span>
                    {parts.join(', ')}
                </div>,
            )
        }
    }

    // Speed range stats
    if (path.details.average_speed) {
        const thresholds = getSpeedThresholds(profile)
        const distBelow = computeSpeedDistances(coords, path.details.average_speed, thresholds)

        const parts: string[] = []
        for (let i = 0; i < thresholds.length; i++) {
            if (distBelow[i] > 0) parts.push(`${pct(distBelow[i], totalDist)}% <${thresholds[i]} km/h`)
        }

        if (parts.length > 0) {
            lines.push(
                <div key="speed">
                    <span className={styles.label}>Speed: </span>
                    {parts.join(', ')}
                </div>,
            )
        }
    }

    // Naismith time (foot profiles only)
    if (ApiImpl.isFootLike(profile) && path.ascend > 0) {
        // Naismith's rule: 5 km/h horizontal + 1 hour per 600m ascent
        const horizontalMinutes = (totalDist / 1000 / 5) * 60
        const ascentMinutes = (path.ascend / 600) * 60
        const naismithMinutes = horizontalMinutes + ascentMinutes

        lines.push(
            <div key="naismith">
                <span className={styles.label}>Naismith: </span>
                {formatTime(naismithMinutes)}
            </div>,
        )
    }

    if (lines.length === 0) return null

    return <div className={styles.routeStats}>{lines}</div>
}
