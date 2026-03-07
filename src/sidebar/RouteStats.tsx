import React, { useState } from 'react'
import { Path } from '@/api/graphhopper'
import { Position } from 'geojson'
import { ApiImpl } from '@/api/Api'
import { tr } from '@/translation/Translation'
import styles from './RouteStats.module.css'
import { NAMED_COLOR_MAPS, INCLINE_CATEGORIES, SPEED_COLORS, getSpeedThresholds, getSpeedLabels, computeInclineCategoryDistances, planeDist, isMissingValue } from '@/pathDetails/elevationWidget/colors'

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
        dist += planeDist(coords[i], coords[i + 1])
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

// Compute cumulative distances below each speed threshold
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

// --- Detail entries & components ---

interface DetailEntry {
    name: string
    km: string
    color: string
    fraction: number
    title?: string
}

interface SummaryEntry {
    name: string
    value: string
    colors?: string[]
    more?: boolean
}

// Get colors of the top N contributors and whether there are more
function topColors(colorMap: Record<string, string>, distMap: Map<string, number>, keys: Iterable<string>, n: number = 4) {
    const sorted = [...keys]
        .map(k => ({ key: k, dist: distMap.get(k) || 0 }))
        .filter(e => e.dist > 0)
        .sort((a, b) => b.dist - a.dist)
    return {
        colors: sorted.slice(0, n).map(e => colorMap[e.key] || '#BDBDBD'),
        more: sorted.length > n,
    }
}

// Build detail entries from a distance map, sorted by distance descending
function detailEntries(colorMap: Record<string, string>, distMap: Map<string, number>, totalDist: number, missingLabel = 'missing'): DetailEntry[] {
    return [...distMap.entries()]
        .filter(([, d]) => d > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([name, d]) => ({
            name: isMissingValue(name) ? missingLabel : name,
            km: fmtKm(d),
            color: colorMap[name] || '#BDBDBD',
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

// Persist expand/collapse state across component remounts (e.g. when route recalculates after adding a point)
const expandedStatsSet = new Set<string>()

function ExpandableStat({
    statKey,
    label,
    summary,
    details,
    extraInfo,
}: {
    statKey: string
    label: string
    summary?: string
    details?: DetailEntry[]
    extraInfo?: SummaryEntry[]
}) {
    const [expanded, setExpanded] = useState(() => expandedStatsSet.has(statKey))
    const hasDetails = (details && details.length > 0)
    const hasExpanded = hasDetails || (extraInfo && extraInfo.length > 0)

    const toggle = () => {
        setExpanded(prev => {
            const next = !prev
            if (next) expandedStatsSet.add(statKey)
            else expandedStatsSet.delete(statKey)
            return next
        })
    }

    return (
        <div>
            <div
                className={hasExpanded ? styles.statClickable : styles.statLine}
                onClick={hasExpanded ? toggle : undefined}
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
                        <div key={d.title || d.name} className={styles.detailRow}>
                            <span className={styles.colorDot} style={{ backgroundColor: d.color }} />
                            {d.title ? (
                                <>
                                    <span className={styles.detailArrow}>{d.name}</span>
                                    <span className={styles.detailRange}>{d.title}</span>
                                </>
                            ) : (
                                <span className={styles.detailName}>{d.name}</span>
                            )}
                            <span className={styles.detailValue}>{d.km}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function RouteStats({ path, profile }: { path: Path; profile: string }) {
    const coords = path.points.coordinates
    const totalDist = path.distance
    if (totalDist <= 0) return null

    const lines: React.ReactNode[] = []

    // Incline (from 3D polyline) should come first, so it's close to the elevation widget on mobile
    if (coords.length > 1 && coords[0].length >= 3) {
        const categoryDistances = computeInclineCategoryDistances(coords)
        const inclineDetails = categoryDistances
            .map((d, i) => ({ name: INCLINE_CATEGORIES[i].label, km: fmtKm(d), color: INCLINE_CATEGORIES[i].color, fraction: d / totalDist, title: INCLINE_CATEGORIES[i].tooltip }))
            .filter(d => d.fraction > 0)
        lines.push(
            <ExpandableStat
                key="incline"
                statKey="incline"
                label={tr('route_stats_incline')}
                details={inclineDetails}
                extraInfo={[
                    { name: 'total ascent', value: `${Math.floor(path.ascend)} m` },
                    { name: 'total descent', value: `${Math.floor(path.descend)} m` },
                ]}
            />,
        )
    }

    // surface
    const surfaceColors = NAMED_COLOR_MAPS['surface'] || {}
    if (path.details.surface) {
        const dist = computeDetailDistances(coords, path.details.surface)
        if (dist.size > 0) {
            const pavedDist = sumForKeys(dist, PAVED)
            const unpavedDist = sumForKeys(dist, UNPAVED)
            const extra: SummaryEntry[] = []
            if (pavedDist > 0) extra.push({ name: 'paved', value: pct(pavedDist, totalDist), ...topColors(surfaceColors, dist, PAVED) })
            if (unpavedDist > 0) extra.push({ name: 'unpaved', value: pct(unpavedDist, totalDist), ...topColors(surfaceColors, dist, UNPAVED) })
            lines.push(
                <ExpandableStat key="surface" statKey="surface" label={tr('route_stats_surface')} details={detailEntries(surfaceColors, dist, totalDist)} extraInfo={extra} />,
            )
        }
    }

    // bike / foot network
    const networks: [string, string, [number, number, any][] | undefined, boolean][] = [
        ['bike_network', tr('route_stats_bike_network'), path.details.bike_network, ApiImpl.isBikeLike(profile)],
        ['foot_network', tr('route_stats_foot_network'), path.details.foot_network, ApiImpl.isFootLike(profile)],
    ]
    for (const [key, label, details, active] of networks) {
        if (active && details) {
            const colors = NAMED_COLOR_MAPS[key] || {}
            const dist = computeDetailDistances(coords, details)
            const onNetwork = sumForKeys(dist, NETWORK_KEYS)
            if (dist.size > 0) {
                lines.push(
                    <ExpandableStat
                        key={key}
                        statKey={key}
                        label={label}
                        details={detailEntries(colors, dist, totalDist)}
                        extraInfo={[{ name: 'on network', value: pct(onNetwork, totalDist), ...topColors(colors, dist, NETWORK_KEYS) }]}
                    />,
                )
            }
        }
    }

    // Roads
    const roadColors = NAMED_COLOR_MAPS['road_class'] || {}
    if (path.details.road_class) {
        const dist = computeDetailDistances(coords, path.details.road_class)
        if (dist.size > 0) {
            const extra: SummaryEntry[] = []
            const big = sumForKeys(dist, BIG_ROADS)
            const medium = sumForKeys(dist, MEDIUM_ROADS)
            const small = sumForKeys(dist, SMALL_ROADS)
            if (big > 0) extra.push({ name: 'big roads', value: pct(big, totalDist), ...topColors(roadColors, dist, BIG_ROADS) })
            if (medium > 0) extra.push({ name: 'medium', value: pct(medium, totalDist), ...topColors(roadColors, dist, MEDIUM_ROADS) })
            if (small > 0) extra.push({ name: 'small', value: pct(small, totalDist), ...topColors(roadColors, dist, SMALL_ROADS) })
            lines.push(
                <ExpandableStat key="roads" statKey="roads" label={tr('route_stats_roads')} details={detailEntries(roadColors, dist, totalDist)} extraInfo={extra} />,
            )
        }
    }

    // Speed
    if (path.details.average_speed) {
        const thresholds = getSpeedThresholds(profile)
        const distBelow = computeSpeedDistances(coords, path.details.average_speed, thresholds)
        const boundaries = [0, ...distBelow, totalDist]
        const speedLabels = getSpeedLabels(thresholds).map(s => `${s} km/h`)
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
                statKey="speed"
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
    /*
    if (ApiImpl.isFootLike(profile) && (path.ascend > 0 || path.descend > 0)) {
        const tH = (totalDist / 1000 / 4) * 60
        const tV = (path.ascend / 300 + path.descend / 500) * 60
        lines.push(
            <ExpandableStat key="hiking_time" label={tr('route_stats_hiking_time')} summary={formatTime(Math.max(tH, tV) + Math.min(tH, tV) / 2)} />,
        )
    }
     */

    return lines.length > 0 ? <div className={styles.routeStats}>{lines}</div> : null
}
