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

    routeWithDispatch(args: RoutingArgs, zoom: boolean): void

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
    private routeCounter = 0
    private lastRouteNumber = -1

    constructor(routingApi: string, geocodingApi: string, apiKey: string) {
        this.apiKey = apiKey
        this.routingApi = routingApi
        this.geocodingApi = geocodingApi
    }

    async info(): Promise<ApiInfo> {
        const response = await fetch(this.getRoutingURLWithKey('info').toString(), {
            headers: { Accept: 'application/json' },
        }).catch(() => {
            throw new Error('Could not connect to the Service. Try to reload!')
        })

        const result = await response.json()
        if (response.ok) {
            return ApiImpl.convertToApiInfo(result)
        } else {
            if (result.message) throw new Error(result.message)
            throw new Error(
                'There has been an error. Server responded with ' + response.statusText + ' (' + response.status + ')'
            )
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

        // routing makes not much sense between areas and it is unclear if the center is on a road
        url.searchParams.append('osm_tag', '!place:county')
        url.searchParams.append('osm_tag', '!boundary')
        url.searchParams.append('osm_tag', '!historic')

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

    routeWithDispatch(args: RoutingArgs, zoomOnSuccess: boolean) {
        const routeNumber = this.routeCounter++
        this.route(args)
            .then(result => {
                if (routeNumber > this.lastRouteNumber) {
                    this.lastRouteNumber = routeNumber
                    Dispatcher.dispatch(new RouteRequestSuccess(args, zoomOnSuccess, result))
                } else {
                    const tmp = JSON.stringify(args) + ' ' + routeNumber + ' <= ' + this.lastRouteNumber
                    console.log('Ignore response of earlier started route ' + tmp)
                }
            })
            .catch(error => {
                if (routeNumber > this.lastRouteNumber) {
                    console.warn('error when performing /route request ' + routeNumber + ': ', error)
                    this.lastRouteNumber = routeNumber
                    Dispatcher.dispatch(new RouteRequestFailed(args, error.message))
                } else {
                    const tmp = JSON.stringify(args) + ' ' + routeNumber + ' <= ' + this.lastRouteNumber
                    console.log('Ignore error ' + error.message + ' of earlier started route ' + tmp)
                }
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
        let profileConfig = config.profiles ? (config.profiles as any)[args.profile] : {}
        let details = config.request?.details ? config.request.details : []
        // don't query all path details for all profiles (e.g. foot_network and get_off_bike are not enabled for motor vehicles)
        if (profileConfig?.details) details = [...details, ...profileConfig.details] // don't modify original arrays!

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
            ...profileConfig,
            details: details,
        }

        if (args.customModel) {
            request.custom_model = args.customModel
            request['ch.disable'] = true
        }

        if (args.points.length <= 2 && args.maxAlternativeRoutes > 1 && !(request as any)['curbsides']) {
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
        const profiles: RoutingProfile[] = []

        for (const profileIndex in response.profiles as ApiProfile[]) {
            const profile: RoutingProfile = {
                name: response.profiles[profileIndex].name,
            }

            profiles.push(profile)
        }

        for (const property in response) {
            if (property === 'bbox') bbox = response[property]
            else if (property === 'version') version = response[property]
        }

        return {
            profiles: profiles,
            elevation: response.elevation,
            bbox: bbox,
            version: version,
            encoded_values: response.encoded_values,
        }
    }

    private static decodeResult(result: RawResult, is3D: boolean) {
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

    public static isTruck(profile: string) {
        return profile.includes('truck')
    }
}
