import Dispatcher from '@/stores/Dispatcher'
import { InfoReceived, RouteReceived } from '@/actions/Actions'

const default_host = 'https://graphhopper.com/api/1'
const default_route_base_path = '/route'

export const ghKey = 'fb45b8b2-fdda-4093-ac1a-8b57b4e50add'

export type Bbox = [number, number, number, number]

export interface RoutingArgs {
    readonly points: [number, number][]
    readonly key: string
    readonly host?: string
    readonly basePath?: string
    readonly vehicle?: string
    readonly data_type?: string
    readonly locale?: string
    readonly debug?: boolean
    readonly points_encoded?: boolean
    readonly instructions?: boolean
    readonly elevation?: boolean
    readonly optimize?: boolean
}

interface RoutingRequest {
    readonly points: ReadonlyArray<[number, number]>
    vehicle: string
    locale: string
    debug: boolean
    points_encoded: boolean
    instructions: boolean
    elevation: boolean
    optimize: string

    [index: string]: string | boolean | ReadonlyArray<[number, number]>
}

interface ErrorResponse {
    message: string
    hints: unknown
}

export interface RoutingResult {
    info: { copyright: string[]; took: number }
    paths: Path[]
}

export interface ApiInfo {
    import_date: string
    version: string
    bbox: Bbox
    vehicles: RoutingVehicle[]
}

export interface RoutingVehicle {
    key: string
    version: string
    import_date: string // maybe parse this to date instead?
    features: RoutingFeature // Unsure if a map would make more sense but from looking at the api typing it makes sense (talk to peter)
}

export interface RoutingFeature {
    elevation: boolean
}

export interface Path {
    distance: number
    time: number
    ascend: number
    descend: number
    points: LineString
    snapped_waypoints: LineString
    points_encoded: boolean
    bbox: Bbox
    instructions: Instruction[]
    details: Details
    points_order: number[]
}

export interface LineString {
    type: string
    coordinates: number[][]
}

export interface Instruction {
    distance: number
    interval: [number, number]
    points: number[][]
    sign: number
    text: string
    time: number
}

interface Details {
    street_name: [number, number, string][]
    toll: [number, number, string][]
    max_speed: [number, number, number][]
}

export interface GeocodingResult {
    hits: GeocodingHit[]
    took: number
}

export interface GeocodingHit {
    point: { lat: number; lng: number }
    osm_id: string
    osm_type: string
    osm_key: string
    osm_value: string
    name: string
    country: string
    city: string
    state: string
    street: string
    housenumber: string
    postcode: string
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

export async function info(key: string) {
    const response = await fetch(default_host + '/info?key=' + key, {
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

export default async function route(args: RoutingArgs) {
    if (args.points_encoded === true) throw Error('Encoded points are not yet implemented')

    const request = createRequest(args)
    const url = createURL(args)

    const response = await fetch(url.toString(), {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(request),
        headers: {
            Accept: args.data_type ? args.data_type : 'application/json',
            'Content-Type': 'application/json',
        },
    })

    if (response.ok) {
        // there will be points encoding and getting instructions right later, but opt for the bare minimum for now
        const result = (await response.json()) as RoutingResult
        Dispatcher.dispatch(new RouteReceived(result))
    } else {
        const errorResult = (await response.json()) as ErrorResponse
        throw new Error(errorResult.message)
    }
}

export async function routeGet(args: RoutingArgs) {
    const request = createRequest(args)
    const url = createGetURL(args.host, args.basePath, args.key, request)

    const response = await fetch(url.toString(), {
        headers: {
            Accept: args.data_type ? args.data_type : 'application/json',
        },
    })

    if (response.ok) {
        const result = await response.json()
        result.paths.forEach((path: Path) => {
            // convert encoded polyline to geojson
            if (path.points_encoded) {
                path.points = {
                    type: 'LineString',
                    coordinates: decodePath(path.points, request.elevation),
                }
                path.snapped_waypoints = {
                    type: 'LineString',
                    coordinates: decodePath(path.snapped_waypoints, request.elevation),
                }
            }
            if (path.instructions) {
                for (let i = 0; i < path.instructions.length; i++) {
                    const interval = path.instructions[i].interval
                    path.instructions[i].points = path.points.coordinates.slice(interval[0], interval[1] + 1)
                }
            }
        })
        return result
    } else {
        // original code has GHUTIL.extracterrors
        throw Error('something went wrong ')
    }
}

function decodePath(encoded: any, is3D: any): number[][] {
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

function createGetURL(host = default_host, basePath = default_route_base_path, key: string, options: RoutingRequest) {
    const url = new URL(host + basePath)

    url.searchParams.append('key', key)
    for (const key in options) {
        if (!options.hasOwnProperty(key)) continue // skip inherited properties

        const value = options[key]

        if (key === 'points') {
            const points = value as [number, number][]
            createPointParams(points).forEach(param => {
                url.searchParams.append(param[0], param[1])
            })
        } else {
            url.searchParams.append(key, encodeURIComponent(value as string | boolean)) // point are already filtered
        }
    }

    return url
}

function createPointParams(points: [number, number][]): [string, string][] {
    return points.map(point => {
        return ['point', point[0] + ',' + point[1]]
    })
}

function createURL(args: { host?: string; basePath?: string; key: string }) {
    const host = args.host ? args.host : default_host
    const basePath = args.basePath ? args.basePath : default_route_base_path
    const url = new URL(host + basePath)
    url.searchParams.append('key', args.key)
    return url
}

function createRequest(args: RoutingArgs): RoutingRequest {
    return {
        vehicle: args.vehicle || 'car',
        elevation: args.elevation || false,
        debug: args.debug || false,
        instructions: args.instructions !== undefined ? args.instructions : true,
        locale: args.locale || 'en',
        optimize: args.optimize !== undefined ? args.optimize.toString() : false.toString(),
        points_encoded: args.points_encoded !== undefined ? args.points_encoded : true,
        points: args.points,
    }
}
