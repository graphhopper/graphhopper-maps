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
    RoutingFeature,
    RoutingRequest,
    RoutingResult,
    RoutingVehicle,
} from '@/api/graphhopper'
import { LineString } from 'geojson'

export default interface Api {
    info(): Promise<ApiInfo>
    infoWithDispatch(): void

    route(args: RoutingArgs): Promise<RoutingResult>
    routeWithDispatch(args: RoutingArgs): void

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

    async info(): Promise<ApiInfo> {
        const response = await fetch(this.getURLWithKey('info').toString(), {
            headers: { Accept: 'application/json' },
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
            headers: { Accept: 'application/json' },
        })

        if (response.ok) {
            return (await response.json()) as GeocodingResult
        } else {
            throw new Error('here could be your meaningfull error message')
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
                'Content-Type': 'application/json',
            },
        })

        if (response.ok) {
            // parse from json
            const rawResult = (await response.json()) as RawResult

            // transform encoded points into decoded
            return {
                ...rawResult,
                paths: ApiImpl.decodeResult(rawResult),
            }
        } else {
            const errorResult = (await response.json()) as ErrorResponse
            //Dispatcher.dispatch(new RouteRequestFailed(args, errorResult))
            throw new Error(errorResult.message)
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
            vehicle: args.vehicle,
            elevation: false,
            debug: false,
            instructions: true,
            locale: 'en',
            optimize: 'false',
            points_encoded: true,
        }

        if (args.maxAlternativeRoutes > 1) {
            return {
                ...request,
                'alternative_route.max_paths': args.maxAlternativeRoutes,
                algorithm: 'alternative_route',
            }
        }
        return request
    }

    static convertToApiInfo(response: any): ApiInfo {
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

    private static decodeResult(result: RawResult) {
        return result.paths
            .map((path: RawPath) => {
                return {
                    ...path,
                    points: ApiImpl.decodePoints(path),
                    snapped_waypoints: ApiImpl.decodeWaypoints(path),
                } as Path
            })
            .map((path: Path) => {
                return {
                    ...path,
                    instructions: ApiImpl.setPointsOnInstructions(path),
                }
            })
    }

    private static decodePoints(path: RawPath) {
        if (path.points_encoded)
            return {
                type: 'LineString',
                coordinates: ApiImpl.decodePath(path.points as string, false),
            }
        else return path.points as LineString
    }

    private static decodeWaypoints(path: RawPath) {
        if (path.points_encoded)
            return {
                type: 'LineString',
                coordinates: ApiImpl.decodePath(path.snapped_waypoints as string, false),
            }
        else return path.snapped_waypoints as LineString
    }

    private static setPointsOnInstructions(path: Path) {
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

    private static decodePath(encoded: string, is3D: any): number[][] {
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
