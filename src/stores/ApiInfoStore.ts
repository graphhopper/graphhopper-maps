import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { InfoReceived, LocationUpdate } from '@/actions/Actions'
import { ApiInfo } from '@/api/graphhopper'


export default class ApiInfoStore extends Store<ApiInfo> {
    protected getInitialState(): ApiInfo {
        return {
            version: '',
            bbox: [0, 0, 0, 0],
            vehicles: [],
            import_date: '',
        }
    }

    reduce(state: ApiInfo, action: Action): ApiInfo {
        if(action instanceof LocationUpdate) {
            // zoom closer to current location
            return {
                ...state,
                bbox: [action.coordinate.lng-0.001, action.coordinate.lat-0.001, action.coordinate.lng+0.001, action.coordinate.lat+0.001]
             } as ApiInfo;
        } else
        if (action instanceof InfoReceived) {
            // console.log("NOW ", action.result.bbox)
            return action.result
        }
        return state
    }
}
