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
    road: '#8D6E63',
    ferry: '#1976D2',
    bridge: '#F9A825',
    tunnel: '#424242',
    ford: '#E53935',
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

// Incline categories: ordered from steepest uphill to steepest downhill.
// minSlope is the lower bound (inclusive) for each bucket; getSlopeColor
// iterates in order and picks the first match where percent >= minSlope.
export interface InclineCategory {
    label: string
    shortLabel: string
    tooltip: string
    minSlope: number
    color: string
}

export const INCLINE_CATEGORIES: InclineCategory[] = [
    {
        label: '\u2191\uFE0E\u2191\uFE0E',
        shortLabel: '\u2191\uFE0E\u2191\uFE0E',
        tooltip: '>10%',
        minSlope: 10,
        color: '#D50000',
    },
    { label: '\u2191\uFE0E', shortLabel: '\u2191\uFE0E', tooltip: '6..10%', minSlope: 6, color: '#F44336' },
    { label: '\u2197\uFE0E', shortLabel: '\u2197\uFE0E', tooltip: '3..6%', minSlope: 3, color: '#FF9800' },
    { label: '-', shortLabel: '-', tooltip: '\u22126..3%', minSlope: -6, color: '#2E7D32' },
    {
        label: '\u2193\uFE0E',
        shortLabel: '\u2193\uFE0E',
        tooltip: '\u221210..\u22126%',
        minSlope: -10,
        color: '#42A5F5',
    },
    {
        label: '\u2193\uFE0E\u2193\uFE0E',
        shortLabel: '\u2193\uFE0E\u2193\uFE0E',
        tooltip: '<\u221210%',
        minSlope: -Infinity,
        color: '#1565C0',
    },
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

// Level of Traffic Stress (LTS) 1-4
export interface LTSEntry {
    level: number
    label: string
    color: string
}

export const LTS_COLORS: LTSEntry[] = [
    { level: 1, label: '1', color: '#2E7D32' },
    { level: 2, label: '2', color: '#66BB6A' },
    { level: 3, label: '3', color: '#FFD54F' },
    { level: 4, label: '4', color: '#F44336' },
]

const BIKE_LTS1_ROADS = new Set([
    'cycleway',
    'path',
    'footway',
    'pedestrian',
    'living_street',
    'bridleway',
    'track',
    'corridor',
])
const BIKE_LTS2_ROADS = new Set(['service'])
const BIKE_LTS3_ROADS = new Set(['steps'])
const FOOT_LTS1_ROADS = new Set([
    'footway',
    'pedestrian',
    'path',
    'living_street',
    'steps',
    'bridleway',
    'corridor',
    'track',
    'cycleway',
    'service',
])

export function classifyBikeLTS(roadClass: string, cycleway: string, isRural: boolean): number {
    if (cycleway === 'track' || cycleway === 'separate') return 1
    if (BIKE_LTS1_ROADS.has(roadClass)) return 1
    if (BIKE_LTS2_ROADS.has(roadClass)) return 2
    if (BIKE_LTS3_ROADS.has(roadClass)) return 3
    if (roadClass === 'trunk' || roadClass === 'motorway') return 4
    if (roadClass === 'primary' || roadClass === 'secondary') {
        if ((cycleway === 'lane' || cycleway === 'missing') && !isRural) return 3
        return 4
    }
    if (roadClass === 'tertiary') {
        return cycleway === 'lane' && !isRural ? 2 : 3
    }
    if (roadClass === 'residential') return 2
    if (roadClass === 'unclassified' && isRural) return 3
    return 2
}

export function classifyFootLTS(roadClass: string, sidewalk: string, isRural: boolean): number {
    if (sidewalk === 'yes' || sidewalk === 'separate') return 1
    if (FOOT_LTS1_ROADS.has(roadClass)) return 1
    if (roadClass === 'trunk' || roadClass === 'motorway') return 4
    if (roadClass === 'primary' || roadClass === 'secondary') {
        if (sidewalk === 'missing' && !isRural) return 3
        return 4
    }
    if (roadClass === 'tertiary') return isRural ? 4 : 3
    if (roadClass === 'residential') return 2
    if (roadClass === 'unclassified' && isRural) return 3
    return 2
}

export function computeLTSDistances(
    coords: number[][],
    roadClassDetails: [number, number, string][],
    infraDetails: [number, number, string][] | undefined,
    urbanDensityDetails: [number, number, string][] | undefined,
    classifier: (roadClass: string, infra: string, isRural: boolean) => number,
): number[] {
    const distances = [0, 0, 0, 0]
    if (!roadClassDetails || roadClassDetails.length === 0) return distances

    // Collect all breakpoints from the 3 detail arrays
    const bpSet = new Set<number>()
    for (const [from, to] of roadClassDetails) {
        bpSet.add(from)
        bpSet.add(to)
    }
    if (infraDetails)
        for (const [from, to] of infraDetails) {
            bpSet.add(from)
            bpSet.add(to)
        }
    if (urbanDensityDetails)
        for (const [from, to] of urbanDensityDetails) {
            bpSet.add(from)
            bpSet.add(to)
        }
    const breakpoints = [...bpSet].sort((a, b) => a - b)

    // Build lookup functions
    const findValue = (details: [number, number, string][], idx: number): string => {
        for (const [from, to, val] of details) {
            if (idx >= from && idx < to) return val
        }
        return ''
    }

    for (let i = 0; i < breakpoints.length - 1; i++) {
        const segStart = breakpoints[i]
        const segEnd = breakpoints[i + 1]
        if (segStart >= coords.length - 1 || segEnd > coords.length - 1) continue

        const roadClass = findValue(roadClassDetails, segStart)
        const infra = infraDetails ? findValue(infraDetails, segStart) : ''
        const density = urbanDensityDetails ? findValue(urbanDensityDetails, segStart) : ''
        const isRural = density === 'rural'

        const lts = classifier(roadClass, infra, isRural)

        let dist = 0
        for (let j = segStart; j < segEnd && j < coords.length - 1; j++) {
            dist += planeDist(coords[j], coords[j + 1])
        }
        distances[lts - 1] += dist
    }

    return distances
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
    for (const cat of INCLINE_CATEGORIES) {
        if (percent >= cat.minSlope) return cat.color
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
        const slope = (100 * (coords[i + 1][2] - coords[i][2])) / dist
        for (let j = 0; j < INCLINE_CATEGORIES.length; j++) {
            if (slope >= INCLINE_CATEGORIES[j].minSlope) {
                distances[j] += dist
                break
            }
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
    return value === 'missing'
}

export function assignDiscreteColors(detailKey: string, values: (string | number | boolean)[]): Map<string, string> {
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
