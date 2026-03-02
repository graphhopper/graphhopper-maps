export interface ElevationPoint {
    distance: number
    elevation: number
    lng: number
    lat: number
}

export interface PathDetailSegment {
    fromDistance: number
    toDistance: number
    value: string | number | boolean
    color: string
    coordinates: [number, number][] // [lng, lat]
}

export interface LegendEntry {
    label: string
    color: string
}

export interface ChartPathDetail {
    key: string
    label: string
    type: 'area' | 'bars' | 'line'
    segments: PathDetailSegment[]
    legend: LegendEntry[]
    minValue?: number
    maxValue?: number
    unit?: string
}

export interface ChartData {
    elevation: ElevationPoint[]
    alternativeElevations: ElevationPoint[][]
    pathDetails: ChartPathDetail[]
    viaPointDistances: number[]
    totalDistance: number
}

export interface ChartConfig {
    showDistanceInMiles: boolean
    height: number
    margin: { top: number; right: number; bottom: number; left: number }
    devicePixelRatio: number
}

export interface ChartHoverResult {
    distance: number
    elevationIndex: number
    point: { lng: number; lat: number }
    elevation: number
    segment?: PathDetailSegment
}
