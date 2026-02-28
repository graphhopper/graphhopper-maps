import React, { useState } from 'react'
import { Path } from '@/api/graphhopper'
import { Position } from 'geojson'
import { calcDist } from '@/utils'
import { ApiImpl } from '@/api/Api'
import { tr } from '@/translation/Translation'
import styles from './RouteStats.module.css'

// Stable color map: same value always gets the same color regardless of route
const VALUE_COLORS: Record<string, string> = {
    // Surface - paved (greens)
    asphalt: '#2E7D32',
    paved: '#43A047',
    concrete: '#66BB6A',
    paving_stones: '#81C784',
    'concrete:plates': '#A5D6A7',
    'concrete:lanes': '#388E3C',
    metal: '#00897B',
    // Surface - unpaved (warm/natural tones)
    compacted: '#FFB74D',
    gravel: '#FF8A65',
    fine_gravel: '#FFCC80',
    unpaved: '#C68642',
    ground: '#9E9D24',
    earth: '#8D6E63',
    grass: '#7CB342',
    grass_paver: '#AED581',
    sand: '#FFD54F',
    mud: '#5D4037',
    // Surface - rough/uncomfortable (reds/pinks)
    dirt: '#E53935',
    wood: '#C62828',
    cobblestone: '#D81B60',
    sett: '#AD1457',
    unhewn_cobblestone: '#880E4F',
    // Road classes
    motorway: '#D32F2F',
    trunk: '#E64A19',
    primary: '#F57C00',
    secondary: '#FFA726',
    tertiary: '#42A5F5',
    residential: '#66BB6A',
    unclassified: '#78909C',
    living_street: '#81C784',
    service: '#A5D6A7',
    cycleway: '#2E7D32',
    path: '#66BB6A',
    track: '#81C784',
    bridleway: '#795548',
    footway: '#EC407A',
    pedestrian: '#F48FB1',
    steps: '#FF5722',
    // Network levels
    international: '#2E7D32',
    national: '#66BB6A',
    regional: '#1565C0',
    local: '#42A5F5',
}

const INCLINE_COLORS = ['#2E7D32', '#FF9800', '#F44336', '#7B1FA2']
const INCLINE_LABELS = ['flat (<4%)', 'mild (4–8%)', 'steep (8–12%)', 'very steep (≥12%)']
const SPEED_COLORS = ['#F44336', '#FF9800', '#FFD54F', '#66BB6A', '#2E7D32']

const PAVED = new Set(['asphalt', 'concrete', 'paved', 'paving_stones', 'concrete:plates', 'concrete:lanes', 'metal'])
const UNPAVED = new Set([
    'unpaved', 'gravel', 'dirt', 'grass', 'sand', 'ground', 'earth', 'mud', 'wood',
    'compacted', 'fine_gravel', 'grass_paver', 'cobblestone', 'sett', 'unhewn_cobblestone',
])
const BIG_ROADS = new Set(['primary', 'secondary', 'trunk', 'motorway'])
const MEDIUM_ROADS = new Set(['tertiary', 'residential', 'unclassified', 'living_street', 'service'])
const SMALL_ROADS = new Set(['cycleway', 'path', 'track', 'bridleway'])
const NETWORK_KEYS = ['international', 'national', 'regional', 'local'] as const

// --- Distance computation ---

function segmentDist(coords: Position[], from: number, to: number): number {
    let dist = 0
    for (let i = from; i < to; i++)
        dist += calcDist({ lat: coords[i][1], lng: coords[i][0] }, { lat: coords[i + 1][1], lng: coords[i + 1][0] })
    return dist
}

function computeDetailDistances(coords: Position[], details: [number, number, any][] | undefined): Map<string, number> {
    const distances = new Map<string, number>()
    if (!details) return distances
    for (const [from, to, value] of details) {
        const key = value != null ? String(value) : ''
        distances.set(key, (distances.get(key) || 0) + segmentDist(coords, from, to))
    }
    return distances
}

/** Compute cumulative distances above each incline threshold using 100m smoothing */
function computeInclineDistances(coords: Position[], thresholds: number[]): number[] {
    const distAbove = thresholds.map(() => 0)
    if (coords.length < 2 || coords[0].length < 3) return distAbove
    let dist = 0, prevEle = coords[0], prevPos = coords[0]
    for (let i = 1; i < coords.length; i++) {
        const c = coords[i]
        dist += calcDist({ lat: prevPos[1], lng: prevPos[0] }, { lat: c[1], lng: c[0] })
        prevPos = c
        if (dist > 100) {
            const slope = (100 * Math.abs(c[2] - prevEle[2])) / dist
            for (let t = 0; t < thresholds.length; t++)
                if (slope >= thresholds[t]) distAbove[t] += dist
            prevEle = c
            dist = 0
        }
    }
    return distAbove
}

/** Compute cumulative distances below each speed threshold */
function computeSpeedDistances(coords: Position[], details: [number, number, number][], thresholds: number[]): number[] {
    const distBelow = thresholds.map(() => 0)
    for (const [from, to, speed] of details) {
        const d = segmentDist(coords, from, to)
        for (let t = 0; t < thresholds.length; t++)
            if (speed < thresholds[t]) distBelow[t] += d
    }
    return distBelow
}

function sumForKeys(distances: Map<string, number>, keys: Iterable<string>): number {
    let total = 0
    for (const k of keys) total += distances.get(k) || 0
    return total
}

// --- Formatting ---

function pct(value: number, total: number): string {
    if (total <= 0) return '0%'
    return Math.round((100 * value) / total) + '%'
}

function fmtKm(meters: number): string {
    return (meters / 1000).toFixed(1) + ' km'
}

function formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    if (m === 60) return h + 1 + ' h'
    return h > 0 ? `${h} h ${m} min` : `${m} min`
}

function getSpeedThresholds(profile: string): number[] {
    if (ApiImpl.isMotorVehicle(profile)) return [30, 50, 80]
    if (ApiImpl.isFootLike(profile)) return [3, 4, 5]
    return [5, 10, 15, 20]
}

// --- Detail entries & components ---

interface DetailEntry {
    name: string
    km: string
    color: string
    fraction: number
}

interface SummaryEntry {
    name: string
    value: string
    colors?: string[]
    more?: boolean
}

/** Get colors of the top N contributors and whether there are more */
function topColors(distMap: Map<string, number>, keys: Iterable<string>, n: number = 4) {
    const sorted = [...keys]
        .map(k => ({ key: k, dist: distMap.get(k) || 0 }))
        .filter(e => e.dist > 0)
        .sort((a, b) => b.dist - a.dist)
    return {
        colors: sorted.slice(0, n).map(e => VALUE_COLORS[e.key] || '#BDBDBD'),
        more: sorted.length > n,
    }
}

/** Build detail entries from a distance map, sorted by distance descending */
function detailEntries(distMap: Map<string, number>, totalDist: number, missingLabel = 'unknown'): DetailEntry[] {
    return [...distMap.entries()]
        .filter(([, d]) => d > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([name, d]) => ({
            name: (!name || name === 'missing') ? missingLabel : name,
            km: fmtKm(d),
            color: VALUE_COLORS[name] || '#BDBDBD',
            fraction: d / totalDist,
        }))
}

function ColorBar({ entries }: { entries: DetailEntry[] }) {
    if (entries.length === 0) return null
    return (
        <div className={styles.colorBar}>
            {entries.map((d, i) => (
                <div key={i} className={styles.colorBarSegment} style={{ backgroundColor: d.color, flex: d.fraction }} />
            ))}
        </div>
    )
}

function ExpandableStat({
    label,
    summary,
    details,
    extraInfo,
}: {
    label: string
    summary?: string
    details?: DetailEntry[]
    extraInfo?: SummaryEntry[]
}) {
    const [expanded, setExpanded] = useState(false)
    const hasDetails = !!(details && details.length > 0)
    const hasExpanded = hasDetails || !!(extraInfo && extraInfo.length > 0)

    return (
        <div>
            <div
                className={hasExpanded ? styles.statClickable : styles.statLine}
                onClick={hasExpanded ? () => setExpanded(!expanded) : undefined}
            >
                {hasDetails ? (
                    <>
                        <span className={styles.label}>{label}</span>
                        <ColorBar entries={details!} />
                    </>
                ) : (
                    <span>
                        <span className={styles.label}>{label}: </span>
                        {summary}
                    </span>
                )}
                {hasExpanded && <span className={styles.statArrow}>{expanded ? '▴' : '▾'}</span>}
            </div>
            {expanded && hasExpanded && (
                <div className={styles.statDetails}>
                    {extraInfo && extraInfo.length > 0 && (
                        <div className={styles.statSummary}>
                            {extraInfo.map((info, i) => (
                                <div key={i} className={styles.detailRow}>
                                    {info.colors?.map((c, j) => (
                                        <span key={j} className={styles.colorDot} style={{ backgroundColor: c }} />
                                    ))}
                                    {info.more && <span className={styles.moreDots}>…</span>}
                                    <span className={styles.detailName}>{info.name}</span>
                                    <span className={styles.detailValue}>{info.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {details?.map(d => (
                        <div key={d.name} className={styles.detailRow}>
                            <span className={styles.colorDot} style={{ backgroundColor: d.color }} />
                            <span className={styles.detailName}>{d.name}</span>
                            <span className={styles.detailValue}>{d.km}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// --- Main component ---

export default function RouteStats({ path, profile }: { path: Path; profile: string }) {
    const coords = path.points.coordinates
    const totalDist = path.distance
    if (totalDist <= 0) return null

    const lines: React.ReactNode[] = []

    // Surface
    if (path.details.surface) {
        const dist = computeDetailDistances(coords, path.details.surface)
        if (dist.size > 0) {
            const pavedDist = sumForKeys(dist, PAVED)
            const unpavedDist = sumForKeys(dist, UNPAVED)
            const extra: SummaryEntry[] = []
            if (pavedDist > 0) extra.push({ name: 'paved', value: pct(pavedDist, totalDist), ...topColors(dist, PAVED) })
            if (unpavedDist > 0) extra.push({ name: 'unpaved', value: pct(unpavedDist, totalDist), ...topColors(dist, UNPAVED) })
            lines.push(
                <ExpandableStat key="surface" label={tr('route_stats_surface')} details={detailEntries(dist, totalDist)} extraInfo={extra} />,
            )
        }
    }

    // Bike / foot network
    const networks: [string, string, [number, number, any][] | undefined, boolean][] = [
        ['bike_network', tr('route_stats_bike_network'), path.details.bike_network, ApiImpl.isBikeLike(profile)],
        ['foot_network', tr('route_stats_foot_network'), path.details.foot_network, ApiImpl.isFootLike(profile)],
    ]
    for (const [key, label, details, active] of networks) {
        if (active && details) {
            const dist = computeDetailDistances(coords, details)
            const onNetwork = sumForKeys(dist, NETWORK_KEYS)
            if (dist.size > 0) {
                lines.push(
                    <ExpandableStat
                        key={key}
                        label={label}
                        details={detailEntries(dist, totalDist, 'none')}
                        extraInfo={[{ name: 'on network', value: pct(onNetwork, totalDist), ...topColors(dist, NETWORK_KEYS) }]}
                    />,
                )
            }
        }
    }

    // Roads
    if (path.details.road_class) {
        const dist = computeDetailDistances(coords, path.details.road_class)
        if (dist.size > 0) {
            const extra: SummaryEntry[] = []
            const big = sumForKeys(dist, BIG_ROADS)
            const medium = sumForKeys(dist, MEDIUM_ROADS)
            const small = sumForKeys(dist, SMALL_ROADS)
            if (big > 0) extra.push({ name: 'big roads', value: pct(big, totalDist), ...topColors(dist, BIG_ROADS) })
            if (medium > 0) extra.push({ name: 'medium', value: pct(medium, totalDist), ...topColors(dist, MEDIUM_ROADS) })
            if (small > 0) extra.push({ name: 'small', value: pct(small, totalDist), ...topColors(dist, SMALL_ROADS) })
            lines.push(
                <ExpandableStat key="roads" label={tr('route_stats_roads')} details={detailEntries(dist, totalDist)} extraInfo={extra} />,
            )
        }
    }

    // Incline (from 3D polyline)
    if (coords.length > 1 && coords[0].length >= 3) {
        const distAbove = computeInclineDistances(coords, [4, 8, 12])
        if (distAbove[0] > 0) {
            const segments = [totalDist - distAbove[0], distAbove[0] - distAbove[1], distAbove[1] - distAbove[2], distAbove[2]]
            const inclineDetails = segments
                .map((d, i) => ({ name: INCLINE_LABELS[i], km: fmtKm(d), color: INCLINE_COLORS[i], fraction: d / totalDist }))
                .filter(d => d.fraction > 0)
            lines.push(
                <ExpandableStat
                    key="incline"
                    label={tr('route_stats_incline')}
                    details={inclineDetails}
                    extraInfo={[
                        { name: 'total ascent', value: `${Math.round(path.ascend)} m` },
                        { name: 'total descent', value: `${Math.round(path.descend)} m` },
                    ]}
                />,
            )
        }
    }

    // Speed
    if (path.details.average_speed) {
        const thresholds = getSpeedThresholds(profile)
        const distBelow = computeSpeedDistances(coords, path.details.average_speed, thresholds)
        const boundaries = [0, ...distBelow, totalDist]
        const speedLabels = [
            `< ${thresholds[0]}`,
            ...thresholds.slice(0, -1).map((t, i) => `${t}–${thresholds[i + 1]}`),
            `≥ ${thresholds[thresholds.length - 1]}`,
        ].map(s => `${s} km/h`)
        const speedDetails = boundaries
            .slice(0, -1)
            .map((_, i) => ({
                name: speedLabels[i],
                km: fmtKm(boundaries[i + 1] - boundaries[i]),
                color: SPEED_COLORS[i] || SPEED_COLORS[SPEED_COLORS.length - 1],
                fraction: (boundaries[i + 1] - boundaries[i]) / totalDist,
            }))
            .filter(d => d.fraction > 0)

        const avgSpeed = path.time > 0 ? (totalDist / 1000) / (path.time / 3_600_000) : 0
        let maxSpeed = 0, minSpeed = Infinity
        for (const [, , speed] of path.details.average_speed) {
            if (speed > maxSpeed) maxSpeed = speed
            if (speed < minSpeed) minSpeed = speed
        }

        lines.push(
            <ExpandableStat
                key="speed"
                label={tr('route_stats_speed')}
                details={speedDetails}
                extraInfo={[
                    { name: 'average', value: `${Math.round(avgSpeed)} km/h` },
                    { name: 'minimum', value: `${Math.round(minSpeed)} km/h` },
                    { name: 'maximum', value: `${Math.round(maxSpeed)} km/h` },
                ]}
            />,
        )
    }

    // Swiss hiking time (foot profiles only)
    if (ApiImpl.isFootLike(profile) && (path.ascend > 0 || path.descend > 0)) {
        const tH = (totalDist / 1000 / 4) * 60
        const tV = (path.ascend / 300 + path.descend / 500) * 60
        lines.push(
            <ExpandableStat key="hiking_time" label={tr('route_stats_hiking_time')} summary={formatTime(Math.max(tH, tV) + Math.min(tH, tV) / 2)} />,
        )
    }

    return lines.length > 0 ? <div className={styles.routeStats}>{lines}</div> : null
}
