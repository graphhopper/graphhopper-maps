import Api from '@/api/Api'
import {
    ApiInfo,
    GeocodingResult,
    ReverseGeocodingHit,
    RoutingArgs,
    RoutingResult,
    RoutingResultInfo,
    Bbox,
} from '@/api/graphhopper'
import { POIAndQuery, POIQuery } from '@/pois/AddressParseResult'

export default class DummyApi implements Api {
    geocode(query: string): Promise<GeocodingResult> {
        return Promise.resolve({
            took: 0,
            hits: [],
        })
    }

    reverseGeocode(query: POIQuery, bbox: Bbox): Promise<ReverseGeocodingHit[]> {
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
