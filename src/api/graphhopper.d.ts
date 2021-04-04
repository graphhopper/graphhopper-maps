import { LineString } from 'geojson'

export type Bbox = [number, number, number, number]

export interface RoutingArgs {
    readonly points: [number, number][]
    readonly vehicle: string
    readonly maxAlternativeRoutes: number
}

export interface RoutingRequest {
    readonly points: ReadonlyArray<[number, number]>
    vehicle: string
    locale: string
    debug: boolean
    points_encoded: boolean
    instructions: boolean
    elevation: boolean
    optimize: string
    'alternative_route.max_paths'?: number
    'alternative_route.max_weight_factor'?: number
    'ch.disable'?: boolean
    algorithm?: 'alternative_route' | 'round_trip'
}

export interface ErrorResponse {
    message: string
    hints: unknown
}

export interface RoutingResult {
    readonly info: { copyright: string[]; took: number }
    readonly paths: Path[]
}

export interface RawResult {
    readonly info: { copyright: string[]; took: number }
    readonly paths: RawPath[]
}

export interface ApiInfo {
    readonly import_date: string
    readonly version: string
    readonly bbox: Bbox
    readonly vehicles: RoutingVehicle[]
}

export interface RoutingVehicle {
    readonly key: string
    readonly version: string
    readonly import_date: string // maybe parse this to date instead?
    readonly features: RoutingFeature // Unsure if a map would make more sense but from looking at the api typing it makes sense (talk to peter)
}

export interface RoutingFeature {
    readonly elevation: boolean
}

export interface Path extends BasePath {
    readonly points: LineString
    readonly snapped_waypoints: LineString
}

export interface RawPath extends BasePath {
    readonly points: string | LineString
    readonly snapped_waypoints: string | LineString
}

export interface BasePath {
    readonly distance: number
    readonly time: number
    readonly ascend: number
    readonly descend: number
    readonly points_encoded: boolean
    readonly bbox: Bbox
    readonly instructions: Instruction[]
    readonly details: Details
    readonly points_order: number[]
}

export interface Instruction {
    readonly distance: number
    readonly interval: [number, number]
    readonly points: number[][]
    readonly sign: number
    readonly text: string
    readonly time: number
}

interface Details {
    readonly street_name: [number, number, string][]
    readonly toll: [number, number, string][]
    readonly max_speed: [number, number, number][]
}

export interface GeocodingResult {
    readonly hits: GeocodingHit[]
    readonly took: number
}

export interface GeocodingHit {
    readonly point: { lat: number; lng: number }
    readonly osm_id: string
    readonly osm_type: string
    readonly osm_key: string
    readonly osm_value: string
    readonly name: string
    readonly country: string
    readonly city: string
    readonly state: string
    readonly street: string
    readonly housenumber: string
    readonly postcode: string
}
