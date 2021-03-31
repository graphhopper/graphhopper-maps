import Dispatcher from '@/stores/Dispatcher'
import { InfoReceived, RouteRequestFailed, RouteRequestSuccess } from '@/actions/Actions'

const default_host = 'https://graphhopper.com/api/1'
const default_route_base_path = '/route'

export const ghKey = 'fb45b8b2-fdda-4093-ac1a-8b57b4e50add'

export type Bbox = [number, number, number, number]

export interface RoutingArgs {
    readonly points: [number, number][]
    readonly vehicle?: string
    readonly maxAlternativeRoutes?: number
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

interface RawPath extends BasePath {
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

export interface LineString {
    readonly type: string
    readonly coordinates: number[][]
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

export async function geocode(query: string) {
    const url = new URL('https://graphhopper.com/api/1/geocode')
    url.searchParams.append('key', ghKey)
    url.searchParams.append('q', query)

    const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
    })

    if (response.ok) {
        return (await response.json()) as GeocodingResult
    } else {
        throw new Error('here could be your meaningfull error message')
    }
}

export async function info() {
    const response = await fetch(default_host + '/info?key=' + ghKey, {
        headers: { Accept: 'application/json' },
    })

    if (response.ok) {
        const result = await response.json()
        const apiInfo = convertToApiInfo(result)
        Dispatcher.dispatch(new InfoReceived(apiInfo))
    } else {
        throw new Error('here could be your meaningfull error message')
    }
}

export async function route(args: RoutingArgs) {
    const completeRequest = createRequest(args)

    const url = new URL(default_host + default_route_base_path)
    url.searchParams.append('key', ghKey)

    const response = await fetch(url.toString(), {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(completeRequest),
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
    })

    if (response.ok) {
        // parse from json
        const rawResult = (await response.json()) as RawResult

        // transform encoded points into decoded
        const result = {
            ...rawResult,
            paths: decodeResult(rawResult),
        }

        // send into application
        Dispatcher.dispatch(new RouteRequestSuccess(args, result))
    } else {
        const errorResult = (await response.json()) as ErrorResponse
        Dispatcher.dispatch(new RouteRequestFailed(args, errorResult))
    }
}

function convertToApiInfo(response: any): ApiInfo {
    let bbox = [0, 0, 0, 0] as Bbox
    let version = ''
    let import_date = ''
    const vehicles: RoutingVehicle[] = []

    const features = response.features as { [index: string]: RoutingFeature }

    for (const property in response) {
        if (property in features) {
            const value = response[property]

            const vehicle: RoutingVehicle = {
                features: features[property],
                version: value.version,
                import_date: value.import_date,
                key: property,
            }

            vehicles.push(vehicle)
        } else if (property === 'bbox') bbox = response[property]
        else if (property === 'version') version = response[property]
        else if (property === 'import_date') import_date = response[property]
        else if (property !== 'features') console.log('unexpected property name: ' + property)
    }

    return {
        vehicles: vehicles,
        bbox: bbox,
        version: version,
        import_date: import_date,
    }
}

function decodeResult(result: RawResult) {
    return result.paths
        .map((path: RawPath) => {
            return {
                ...path,
                points: decodePoints(path),
                snapped_waypoints: decodeWaypoints(path),
            }
        })
        .map((path: Path) => {
            return {
                ...path,
                instructions: setPointsOnInstructions(path),
            }
        })
}

function decodePoints(path: RawPath) {
    if (path.points_encoded)
        return {
            type: 'LineString',
            coordinates: decodePath(path.points as string, false),
        }
    else return path.points as LineString
}

function decodeWaypoints(path: RawPath) {
    if (path.points_encoded)
        return {
            type: 'LineString',
            coordinates: decodePath(path.snapped_waypoints as string, false),
        }
    else return path.snapped_waypoints as LineString
}

function setPointsOnInstructions(path: Path) {
    if (path.instructions) {
        return path.instructions.map(instruction => {
            return {
                ...instruction,
                points: path.points.coordinates.slice(instruction.interval[0], instruction.interval[1] + 1),
            }
        })
    } else {
        return path.instructions
    }
}

function decodePath(encoded: string, is3D: any): number[][] {
    const len = encoded.length
    let index = 0
    const array: number[][] = []
    let lat = 0
    let lng = 0
    let ele = 0

    while (index < len) {
        let b
        let shift = 0
        let result = 0
        do {
            b = encoded.charCodeAt(index++) - 63
            result |= (b & 0x1f) << shift
            shift += 5
        } while (b >= 0x20)
        const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
        lat += deltaLat

        shift = 0
        result = 0
        do {
            b = encoded.charCodeAt(index++) - 63
            result |= (b & 0x1f) << shift
            shift += 5
        } while (b >= 0x20)
        const deltaLon = result & 1 ? ~(result >> 1) : result >> 1
        lng += deltaLon

        if (is3D) {
            // elevation
            shift = 0
            result = 0
            do {
                b = encoded.charCodeAt(index++) - 63
                result |= (b & 0x1f) << shift
                shift += 5
            } while (b >= 0x20)
            const deltaEle = result & 1 ? ~(result >> 1) : result >> 1
            ele += deltaEle
            array.push([lng * 1e-5, lat * 1e-5, ele / 100])
        } else array.push([lng * 1e-5, lat * 1e-5])
    }
    // var end = new Date().getTime();
    // console.log("decoded " + len + " coordinates in " + ((end - start) / 1000) + "s");
    return array
}

function createRequest(args: RoutingArgs): RoutingRequest {
    const request: RoutingRequest = {
        points: args.points,
        vehicle: args.vehicle || 'car',
        elevation: false,
        debug: false,
        instructions: true,
        locale: 'en',
        optimize: 'false',
        points_encoded: true,
    }

    if (args.maxAlternativeRoutes && args.maxAlternativeRoutes > 1) {
        return {
            ...request,
            'alternative_route.max_paths': args.maxAlternativeRoutes,
            algorithm: 'alternative_route',
        }
    }
    return request
}
