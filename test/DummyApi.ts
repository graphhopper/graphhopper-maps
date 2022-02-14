import Api from '../src/api/Api'
import { ApiInfo, GeocodingResult, RoutingArgs, RoutingResult } from '../src/api/graphhopper'

export default class DummyApi implements Api {
    geocode(query: string): Promise<GeocodingResult> {
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
            import_date: '',
            profiles: [],
            encoded_values: [],
        })
    }

    infoWithDispatch(): void {}

    route(args: RoutingArgs): Promise<RoutingResult> {
        return Promise.resolve({
            info: { took: 0, copyright: [] },
            paths: [],
        })
    }

    routeWithDispatch(args: RoutingArgs): void {}
}
