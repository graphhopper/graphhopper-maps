import Api from '../src/api/Api'
import {
    ApiInfo,
    GeocodingResult,
    ReverseGeocodingHit,
    RoutingArgs,
    RoutingResult,
    RoutingResultInfo,
    Bbox,
} from '../src/api/graphhopper'
import { POIQuery } from '@/pois/AddressParseResult'

export default class DummyApi implements Api {
    geocode(query: string): Promise<GeocodingResult> {
        return Promise.resolve({
            took: 0,
            hits: [],
        })
    }

    reverseGeocode(bbox: Bbox, queries: POIQuery[]): Promise<ReverseGeocodingHit[]> {
        return Promise.resolve([])
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
