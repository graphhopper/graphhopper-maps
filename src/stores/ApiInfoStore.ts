import { ApiInfo } from '@/routing/Api'
import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { InfoReceived } from '@/actions/Actions'

export default class ApiInfoStore extends Store<ApiInfo> {
    protected getInitialState(): ApiInfo {
        return {
            version: '',
            bbox: [0, 0, 0, 0],
            vehicles: new Map(),
            import_date: '',
        }
    }

    protected reduce(state: ApiInfo, action: Action): ApiInfo {
        if (action instanceof InfoReceived) {
            return action.result
        }
        return state
    }
}
