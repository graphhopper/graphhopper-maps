import Dispatcher from '@/stores/Dispatcher'
import { InfoReceived, RouteRequestFailed, RouteRequestSuccess } from '@/actions/Actions'
import {
    ApiInfo,
    Bbox,
    ErrorResponse,
    GeocodingResult,
    Path,
    RawPath,
    RawResult,
    RoutingArgs,
    RoutingRequest,
    RoutingResult,
    RoutingProfile
} from '@/api/graphhopper'
import { LineString } from 'geojson'
import { Translation } from '@/translation/Translation'

interface ApiProfile {
    name: string
}

export default interface Api {
    info(): Promise<ApiInfo>

    infoWithDispatch(): void

    route(args: RoutingArgs): Promise<RoutingResult>

    routeWithDispatch(args: RoutingArgs): void

    i18n(): Promise<Translation>

    geocode(query: string): Promise<GeocodingResult>
}

export const ghKey = 'fb45b8b2-fdda-4093-ac1a-8b57b4e50add'

export class ApiImpl implements Api {
    private readonly apiKey: string
    private readonly apiAddress: string

    constructor(apiKey = ghKey, apiAddress = 'https://graphhopper.com/api/1/') {
        this.apiKey = apiKey
        this.apiAddress = apiAddress
    }

    async i18n(): Promise<Translation> {
        const response = await fetch(this.getURLWithKey('i18n').toString(), {
            headers: { Accept: 'application/json' }
        })

        if (response.ok) {
            const result = await response.json()
            return new Translation(result.default, result.en)
        } else {
            throw new Error('here could be your meaningfull error message')
        }
    }

    async info(): Promise<ApiInfo> {
        const response = await fetch(this.getURLWithKey('info').toString(), {
            headers: { Accept: 'application/json' }
        })

        if (response.ok) {
            const result = await response.json()
            return ApiImpl.convertToApiInfo(result)
        } else {
            throw new Error('here could be your meaningfull error message')
        }
    }

    infoWithDispatch() {
        this.info()
            .then(result => Dispatcher.dispatch(new InfoReceived(result)))
            .catch(e => console.log(e.message))
    }

    async geocode(query: string) {
        const url = this.getURLWithKey('geocode')
        url.searchParams.append('q', query)

        const response = await fetch(url.toString(), {
            headers: { Accept: 'application/json' }
        })

        if (response.ok) {
            return (await response.json()) as GeocodingResult
        } else {
            throw new Error('here could be your meaningful error message')
        }
    }

    async route(args: RoutingArgs): Promise<RoutingResult> {
        const completeRequest = ApiImpl.createRequest(args)

        const response = await fetch(this.getURLWithKey('route').toString(), {
            method: 'POST',
            mode: 'cors',
            body: JSON.stringify(completeRequest),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        })

        if (response.ok) {
            // parse from json
            const rawResult = (await response.json()) as RawResult

            // transform encoded points into decoded
            return {
                ...rawResult,
                paths: ApiImpl.decodeResult(rawResult, completeRequest.elevation)
            }
        } else {
            const errorResult = (await response.json()) as ErrorResponse
            let message = errorResult.message
            if (errorResult.hints.length > 0)
                message +=
                    (message ? message + ' and ' : '') +
                    (errorResult.hints as any[]).map(hint => hint.message).join(' and ')

            throw new Error(message)
        }
    }

    routeWithDispatch(args: RoutingArgs) {
        this.route(args)
            .then(result => Dispatcher.dispatch(new RouteRequestSuccess(args, result)))
            .catch(error => Dispatcher.dispatch(new RouteRequestFailed(args, error.message)))
    }

    private getURLWithKey(endpoint: string) {
        const url = new URL(this.apiAddress + endpoint)
        url.searchParams.append('key', this.apiKey)
        return url
    }

    static createRequest(args: RoutingArgs): RoutingRequest {
        const request: RoutingRequest = {
            points: args.points,
            profile: args.profile,
            elevation: true,
            debug: false,
            instructions: true,
            locale: 'en',
            optimize: 'false',
            points_encoded: true,
            snap_preventions: ['ferry'],
            details: ['road_class', 'road_environment', 'surface', 'max_speed', 'average_speed']
        }

        if (args.maxAlternativeRoutes > 1) {
            return {
                ...request,
                'alternative_route.max_paths': args.maxAlternativeRoutes,
                algorithm: 'alternative_route'
            }
        }
        return request
    }

    static convertToApiInfo(response: any): ApiInfo {
        let bbox = [0, 0, 0, 0] as Bbox
        let version = ''
        let import_date = ''
        const profiles: RoutingProfile[] = []

        for (const profileIndex in response.profiles as ApiProfile[]) {
            const profile: RoutingProfile = {
                name: response.profiles[profileIndex].name
            }

            profiles.push(profile)
        }

        for (const property in response) {
            if (property === 'bbox') bbox = response[property]
            else if (property === 'version') version = response[property]
            else if (property === 'import_date') import_date = response[property]
        }

        return {
            profiles: profiles,
            elevation: response.elevation,
            bbox: bbox,
            version: version,
            import_date: import_date
        }
    }

    private static decodeResult(result: RawResult, is3D: boolean) {
        return result.paths
            .map((path: RawPath) => {
                return {
                    ...path,
                    points: ApiImpl.decodePoints(path, is3D),
                    snapped_waypoints: ApiImpl.decodeWaypoints(path, is3D)
                } as Path
            })
            .map((path: Path) => {
                return {
                    ...path,
                    instructions: ApiImpl.setPointsOnInstructions(path)
                }
            })
    }

    private static decodePoints(path: RawPath, is3D: boolean) {
        if (path.points_encoded)
            return {
                type: 'LineString',
                coordinates: ApiImpl.decodePath(path.points as string, is3D)
            }
        else return path.points as LineString
    }

    private static decodeWaypoints(path: RawPath, is3D: boolean) {
        if (path.points_encoded)
            return {
                type: 'LineString',
                coordinates: ApiImpl.decodePath(path.snapped_waypoints as string, is3D)
            }
        else return path.snapped_waypoints as LineString
    }

    private static setPointsOnInstructions(path: Path) {
        if (path.instructions) {
            return path.instructions.map(instruction => {
                return {
                    ...instruction,
                    points: path.points.coordinates.slice(instruction.interval[0], instruction.interval[1] + 1)
                }
            })
        } else {
            return path.instructions
        }
    }

    private static decodePath(encoded: string, is3D: boolean): number[][] {
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
}
