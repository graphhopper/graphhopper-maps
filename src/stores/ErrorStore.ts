import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { DismissLastError, RouteRequestFailed, RouteRequestSuccess } from '@/actions/Actions'

export interface ErrorStoreState {
    lastError: string
    isDismissed: boolean
}
export default class ErrorStore extends Store<ErrorStoreState> {
    protected getInitialState(): ErrorStoreState {
        return {
            isDismissed: true,
            lastError: '',
        }
    }

    reduce(state: ErrorStoreState, action: Action): ErrorStoreState {
        if (action instanceof RouteRequestFailed) {
            return {
                lastError: action.errorMessage,
                isDismissed: false,
            }
        } else if (action instanceof DismissLastError || action instanceof RouteRequestSuccess) {
            return {
                ...state,
                isDismissed: true,
            }
        }
        return state
    }
}
