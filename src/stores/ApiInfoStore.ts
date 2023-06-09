import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { InfoReceived } from '@/actions/Actions'
import { ApiInfo } from '@/api/graphhopper'

export default class ApiInfoStore extends Store<ApiInfo> {
    constructor() {
        super(ApiInfoStore.getInitialState())
    }

    private static getInitialState(): ApiInfo {
        return {
            version: '',
            bbox: [0, 0, 0, 0],
            profiles: [],
            elevation: false,
            encoded_values: [],
        }
    }

    reduce(state: ApiInfo, action: Action): ApiInfo {
        if (action instanceof InfoReceived) {
            return action.result
        }
        return state
    }
}
