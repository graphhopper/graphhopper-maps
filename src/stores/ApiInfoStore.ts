import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { InfoReceived } from '@/actions/Actions'
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
        if (action instanceof InfoReceived) {
            return action.result
        }
        return state
    }
}
