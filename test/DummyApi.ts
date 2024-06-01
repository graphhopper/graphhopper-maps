import Api from '../src/api/Api'
import { ApiInfo, GeocodingResult, RoutingArgs, RoutingResult, RoutingResultInfo } from '../src/api/graphhopper'
import { Coordinate } from '@/stores/QueryStore'

export default class DummyApi implements Api {
    geocode(query: string): Promise<GeocodingResult> {
        return Promise.resolve({
            took: 0,
            hits: [],
        })
    }

    reverseGeocode(query: string | undefined, point: Coordinate, radius: number, tags?: string[]): Promise<GeocodingResult> {
        return Promise.resolve({
            took: 0,
            hits: [],
        })
    }

    info(): Promise<ApiInfo> {
        return Promise.resolve({
            bbox: [0, 0, 0, 0],
            elevation: false,
            version: '',
            profiles: [],
            encoded_values: [],
        })
    }

    route(args: RoutingArgs): Promise<RoutingResult> {
        return Promise.resolve({
            info: { took: 0, road_data_timestamp: '', copyright: [] } as RoutingResultInfo,
            paths: [],
        })
    }

    routeWithDispatch(args: RoutingArgs): void {}

    supportsGeocoding(): boolean {
        return true
    }
}
