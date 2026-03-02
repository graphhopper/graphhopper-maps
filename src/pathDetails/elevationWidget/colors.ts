export const SURFACE_COLORS: Record<string, string> = {
    asphalt: '#2E7D32',
    paved: '#43A047',
    concrete: '#388E3C',
    'concrete:plates': '#388E3C',
    'concrete:lanes': '#388E3C',
    paving_stones: '#4CAF50',
    compacted: '#8BC34A',
    fine_gravel: '#CDDC39',
    gravel: '#FF8A65',
    unpaved: '#C68642',
    dirt: '#E53935',
    sand: '#FFB74D',
    ground: '#A1887F',
    grass: '#66BB6A',
    cobblestone: '#D81B60',
    'cobblestone:flattened': '#D81B60',
    sett: '#AB47BC',
    wood: '#795548',
    metal: '#607D8B',
}

export const ROAD_CLASS_COLORS: Record<string, string> = {
    motorway: '#D32F2F',
    trunk: '#E64A19',
    primary: '#F57C00',
    secondary: '#FFA000',
    tertiary: '#FDD835',
    residential: '#90A4AE',
    unclassified: '#B0BEC5',
    service: '#CFD8DC',
    living_street: '#80CBC4',
    track: '#A1887F',
    cycleway: '#2E7D32',
    footway: '#4CAF50',
    path: '#66BB6A',
    pedestrian: '#81C784',
    steps: '#FF5722',
    bridleway: '#8D6E63',
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

// Named color maps for known detail keys
const NAMED_COLOR_MAPS: Record<string, Record<string, string>> = {
    surface: SURFACE_COLORS,
    road_class: ROAD_CLASS_COLORS,
    road_environment: ROAD_ENVIRONMENT_COLORS,
    track_type: TRACK_TYPE_COLORS,
    toll: TOLL_COLORS,
}

// Incline categories: grouped by absolute slope percentage
export interface InclineCategory {
    label: string
    maxSlope: number
    color: string
}

export const INCLINE_CATEGORIES: InclineCategory[] = [
    { label: '0-3%', maxSlope: 3, color: '#66BB6A' },
    { label: '3-6%', maxSlope: 6, color: '#FFC107' },
    { label: '6-10%', maxSlope: 10, color: '#FF7043' },
    { label: '>10%', maxSlope: Infinity, color: '#E53935' },
]

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
