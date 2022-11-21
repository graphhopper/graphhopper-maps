import Dispatcher from '@/stores/Dispatcher'
import { RouteRequestFailed, RouteRequestSuccess } from '@/actions/Actions'
import {
    ApiInfo,
    Bbox,
    ErrorResponse,
    GeocodingResult,
    Path,
    RawPath,
    RawResult,
    RoutingArgs,
    RoutingProfile,
    RoutingRequest,
    RoutingResult,
} from '@/api/graphhopper'
import { LineString } from 'geojson'
import { getTranslation, tr } from '@/translation/Translation'
import * as config from 'config'

interface ApiProfile {
    name: string
}

export default interface Api {
    info(): Promise<ApiInfo>

    route(args: RoutingArgs): Promise<RoutingResult>

    routeWithDispatch(args: RoutingArgs): void

    geocode(query: string, provider: string): Promise<GeocodingResult>

    supportsGeocoding(): boolean
}

let api: Api | undefined

export function setApi(routingApi: string, geocodingApi: string, apiKey: string) {
    api = new ApiImpl(routingApi, geocodingApi, apiKey)
}

export function getApi() {
    if (!api) throw Error('Api must be initialized before it can be used. Use "setApi" when starting the app')
    return api
}

/**
 * Exporting this so that it can be tested directly. Don't know how to properly set this up in typescript, so that the
 * class could be tested but is not available for usage in the app. In Java one would make this package private I guess.
 */
export class ApiImpl implements Api {
    private readonly apiKey: string
    private readonly routingApi: string
    private readonly geocodingApi: string

    constructor(routingApi: string, geocodingApi: string, apiKey: string) {
        this.apiKey = apiKey
        this.routingApi = routingApi
        this.geocodingApi = geocodingApi
    }

    async info(): Promise<ApiInfo> {
        const response = await fetch(this.getRoutingURLWithKey('info').toString(), {
            headers: { Accept: 'application/json' },
        })

        if (response.ok) {
            const result = await response.json()
            return ApiImpl.convertToApiInfo(result)
        } else {
            throw new Error('Could not connect to the Service. Try to reload!')
        }
    }

    async geocode(query: string, provider: string): Promise<GeocodingResult> {
        if (!this.supportsGeocoding())
            return {
                hits: [],
                took: 0,
            }
        const url = this.getGeocodingURLWithKey('geocode')
        url.searchParams.append('q', query)
        url.searchParams.append('provider', provider)
        const langAndCountry = getTranslation().getLang().split('_')
        url.searchParams.append('locale', langAndCountry.length > 0 ? langAndCountry[0] : 'en')

        const response = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
        })

        if (response.ok) {
            return (await response.json()) as GeocodingResult
        } else {
            throw new Error('Geocoding went wrong ' + response.status)
        }
    }

    supportsGeocoding(): boolean {
        return this.geocodingApi !== ''
    }

    async route(args: RoutingArgs): Promise<RoutingResult> {
        const completeRequest = ApiImpl.createRequest(args)

        const response = await fetch(this.getRoutingURLWithKey('route').toString(), {
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
                paths: ApiImpl.decodeResult(rawResult, completeRequest.elevation),
            }
        } else if (response.status === 500) {
            // not always true, but most of the time :)
            throw new Error(tr('route_timed_out'))
        } else if (response.status === 400) {
            const errorResult = (await response.json()) as ErrorResponse
            let message = errorResult.message
            if (errorResult.hints && errorResult.hints.length > 0) {
                let messagesFromHints = ''
                errorResult.hints.forEach(hint => {
                    if (!hint.message.includes(message)) {
                        messagesFromHints += (messagesFromHints ? ' and ' : '') + messagesFromHints
                        messagesFromHints += hint.message
                    }
                })
                if (messagesFromHints) message += (message ? ' and ' : '') + messagesFromHints
            }
            throw new Error(message)
        } else {
            throw new Error(tr('route_request_failed'))
        }
    }

    routeWithDispatch(args: RoutingArgs) {
        this.route(args)
            .then(result => Dispatcher.dispatch(new RouteRequestSuccess(args, result)))
            .catch(error => {
                console.warn('error when performing /route request: ', error)
                return Dispatcher.dispatch(new RouteRequestFailed(args, error.message))
            })
    }

    private getRoutingURLWithKey(endpoint: string) {
        const url = new URL(this.routingApi + endpoint)
        url.searchParams.append('key', this.apiKey)
        return url
    }

    private getGeocodingURLWithKey(endpoint: string) {
        const url = new URL(this.geocodingApi + endpoint)
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
            locale: getTranslation().getLang(),
            optimize: 'false',
            points_encoded: true,
            snap_preventions: config.request?.snapPreventions ? config.request.snapPreventions : [],
            details: config.request?.details ? config.request.details : [],
            ...(config.extraProfiles ? (config.extraProfiles as any)[args.profile] : {}),
        }

        if (args.customModel) {
            request['ch.disable'] = true
            request.custom_model = args.customModel
        }

        if (args.heading) {
            request['ch.disable'] = true
            request.headings = [args.heading]
            request.heading_penalty = 120
        }

        if (args.points.length <= 2 && args.maxAlternativeRoutes > 1) {
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
        const profiles: RoutingProfile[] = []

        for (const profileIndex in response.profiles as ApiProfile[]) {
            const profile: RoutingProfile = {
                name: response.profiles[profileIndex].name,
            }

            profiles.push(profile)
        }

        // group similarly named profiles into the following predefined order
        const reservedOrder = ['car', 'truck', 'scooter', 'foot', 'hike', 'bike']
        profiles.sort((a, b) => {
            let idxa = reservedOrder.findIndex(str => a.name.indexOf(str) >= 0)
            let idxb = reservedOrder.findIndex(str => b.name.indexOf(str) >= 0)
            if (idxa < 0) idxa = reservedOrder.length
            if (idxb < 0) idxb = reservedOrder.length
            return idxa - idxb
        })

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
            import_date: import_date,
            encoded_values: response.encoded_values,
        }
    }

    public static decodeResult(result: RawResult, is3D: boolean) {
        return result.paths
            .map((path: RawPath) => {
                return {
                    ...path,
                    points: ApiImpl.decodePoints(path, is3D),
                    snapped_waypoints: ApiImpl.decodeWaypoints(path, is3D),
                } as Path
            })
            .map((path: Path) => {
                return {
                    ...path,
                    instructions: ApiImpl.setPointsOnInstructions(path),
                }
            })
    }

    private static decodePoints(path: RawPath, is3D: boolean) {
        if (path.points_encoded)
            return {
                type: 'LineString',
                coordinates: ApiImpl.decodePath(path.points as string, is3D),
            }
        else return path.points as LineString
    }

    private static decodeWaypoints(path: RawPath, is3D: boolean) {
        if (path.points_encoded)
            return {
                type: 'LineString',
                coordinates: ApiImpl.decodePath(path.snapped_waypoints as string, is3D),
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
        return array
    }

    public static isBikeLike(profile: string) {
        return profile.includes('mtb') || profile.includes('bike')
    }

    public static isMotorVehicle(profile: string) {
        return profile.includes('car') || profile.includes('truck') || profile.includes('scooter')
    }
}
