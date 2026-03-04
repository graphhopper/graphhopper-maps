export const SURFACE_COLORS: Record<string, string> = {
    // Paved (greens)
    asphalt: '#2E7D32',
    paved: '#43A047',
    concrete: '#66BB6A',
    'concrete:plates': '#A5D6A7',
    'concrete:lanes': '#388E3C',
    paving_stones: '#81C784',
    metal: '#00897B',
    // Unpaved (warm/natural tones)
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
    // Rough/uncomfortable (reds/pinks)
    dirt: '#E53935',
    wood: '#C62828',
    cobblestone: '#D81B60',
    'cobblestone:flattened': '#D81B60',
    sett: '#AD1457',
    unhewn_cobblestone: '#880E4F',
}

export const ROAD_CLASS_COLORS: Record<string, string> = {
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
}

export const ROAD_ENVIRONMENT_COLORS: Record<string, string> = {
    road: '#757575',
    ferry: '#1976D2',
    bridge: '#5D4037',
    tunnel: '#37474F',
    ford: '#FF8F00',
}

export const TRACK_TYPE_COLORS: Record<string, string> = {
    grade1: '#2E7D32',
    grade2: '#8BC34A',
    grade3: '#FFC107',
    grade4: '#FF9800',
    grade5: '#E53935',
}

export const TOLL_COLORS: Record<string, string> = {
    no: '#4CAF50',
    all: '#E53935',
    hgv: '#FF9800',
}

export const NETWORK_COLORS: Record<string, string> = {
    international: '#2E7D32',
    national: '#66BB6A',
    regional: '#1565C0',
    local: '#42A5F5',
}

// Named color maps for known detail keys
export const NAMED_COLOR_MAPS: Record<string, Record<string, string>> = {
    surface: SURFACE_COLORS,
    road_class: ROAD_CLASS_COLORS,
    road_environment: ROAD_ENVIRONMENT_COLORS,
    track_type: TRACK_TYPE_COLORS,
    toll: TOLL_COLORS,
    bike_network: NETWORK_COLORS,
    foot_network: NETWORK_COLORS,
}

// Incline categories: grouped by absolute slope percentage
export interface InclineCategory {
    label: string
    shortLabel: string
    maxSlope: number
    color: string
}

export const INCLINE_CATEGORIES: InclineCategory[] = [
    { label: 'flat (\u22643%)', shortLabel: 'flat', maxSlope: 3, color: '#2E7D32' },
    { label: 'mild (3\u20136%)', shortLabel: 'mild', maxSlope: 6, color: '#FF9800' },
    { label: 'steep (6\u201310%)', shortLabel: 'steep', maxSlope: 10, color: '#F44336' },
    { label: 'very steep (>10%)', shortLabel: 'v. steep', maxSlope: Infinity, color: '#7B1FA2' },
]

// Speed colors: red (slow) -> green (fast), with profile-specific thresholds
export const SPEED_COLORS = ['#F44336', '#FF9800', '#FFD54F', '#66BB6A', '#2E7D32']

export function getSpeedThresholds(profile: string): number[] {
    const isMotorVehicle =
        (profile.includes('car') && !profile.includes('cargobike')) ||
        profile.includes('truck') ||
        profile.includes('scooter') ||
        profile.includes('bus') ||
        profile.includes('motorcycle')
    const isFootLike = profile.includes('hike') || profile.includes('foot')

    if (isMotorVehicle) return [30, 50, 80]
    if (isFootLike) return [3, 4, 5]
    return [5, 10, 15, 20] // bike-like default
}

export function getSpeedColor(speed: number, thresholds: number[]): string {
    for (let i = 0; i < thresholds.length; i++) {
        if (speed < thresholds[i]) return SPEED_COLORS[i]
    }
    return SPEED_COLORS[Math.min(thresholds.length, SPEED_COLORS.length - 1)]
}

export function getSpeedLabels(thresholds: number[]): string[] {
    return [
        `< ${thresholds[0]}`,
        ...thresholds.slice(0, -1).map((t, i) => `${t}\u2013${thresholds[i + 1]}`),
        `\u2265 ${thresholds[thresholds.length - 1]}`,
    ]
}

// Colorblind-friendly palette from SRON (https://personal.sron.nl/~pault/#sec:qualitative)
export const DISCRETE_PALETTE = [
    '#332288',
    '#88ccee',
    '#44aa99',
    '#117733',
    '#999933',
    '#ddcc77',
    '#cc6677',
    '#882255',
    '#aa4499',
]

const MISSING_COLOR = '#dddddd'

export function getSlopeColor(percent: number): string {
    const abs = Math.abs(percent)
    for (const cat of INCLINE_CATEGORIES) {
        if (abs <= cat.maxSlope) return cat.color
    }
    return INCLINE_CATEGORIES[INCLINE_CATEGORIES.length - 1].color
}

/**
 * Equirectangular plane projection distance, consistent with GraphHopper's DistancePlaneProjection.
 * See graphhopper#3296.
 */
export function planeDist(p: number[], q: number[]): number {
    const toRad = (deg: number) => deg * 0.017453292519943295
    const dLat = toRad(q[1] - p[1])
    const dLon = toRad(q[0] - p[0])
    const x = Math.cos(toRad((p[1] + q[1]) / 2)) * dLon
    return 6371000 * Math.sqrt(dLat * dLat + x * x)
}

/** Compute distance per incline category from [lng, lat, ele] coordinates. Returns array parallel to INCLINE_CATEGORIES. */
export function computeInclineCategoryDistances(coords: number[][]): number[] {
    const distances = INCLINE_CATEGORIES.map(() => 0)
    if (coords.length < 2 || coords[0].length < 3) return distances
    for (let i = 0; i < coords.length - 1; i++) {
        const dist = planeDist(coords[i], coords[i + 1])
        if (dist <= 0) continue
        const absSlope = (100 * Math.abs(coords[i + 1][2] - coords[i][2])) / dist
        for (let j = 0; j < INCLINE_CATEGORIES.length; j++) {
            if (absSlope <= INCLINE_CATEGORIES[j].maxSlope) { distances[j] += dist; break }
        }
    }
    return distances
}

export function getNumericGradientColor(factor: number): string {
    // blue [0,153,247] to red [241,23,18]
    const clamped = Math.max(0, Math.min(1, factor))
    const r = Math.round(0 + clamped * (241 - 0))
    const g = Math.round(153 + clamped * (23 - 153))
    const b = Math.round(247 + clamped * (18 - 247))
    return `rgb(${r}, ${g}, ${b})`
}

export function isMissingValue(value: string | number | boolean): boolean {
    return value === 'missing' || value === 'unclassified' || value === 'Undefined' || value === ''
}

export function assignDiscreteColors(
    detailKey: string,
    values: (string | number | boolean)[],
): Map<string, string> {
    const colorMap = new Map<string, string>()
    const namedMap = NAMED_COLOR_MAPS[detailKey]

    let paletteIndex = 0
    for (const val of values) {
        const key = String(val)
        if (colorMap.has(key)) continue

        if (isMissingValue(val)) {
            colorMap.set(key, MISSING_COLOR)
        } else if (namedMap && namedMap[key]) {
            colorMap.set(key, namedMap[key])
        } else {
            colorMap.set(key, DISCRETE_PALETTE[paletteIndex % DISCRETE_PALETTE.length])
            paletteIndex++
        }
    }
    return colorMap
}
