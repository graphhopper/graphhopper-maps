import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'

export interface CurrentLocationStoreState {
    enabled: boolean
    tracking: boolean
    hasPermission: boolean | null
}

export class ToggleCurrentLocation implements Action {
    readonly enabled: boolean

    constructor(enabled: boolean) {
        this.enabled = enabled
    }
}

export class ToggleLocationTracking implements Action {
    readonly tracking: boolean

    constructor(tracking: boolean) {
        this.tracking = tracking
    }
}

export class SetLocationPermission implements Action {
    readonly hasPermission: boolean | null

    constructor(hasPermission: boolean | null) {
        this.hasPermission = hasPermission
    }
}

export default class CurrentLocationStore extends Store<CurrentLocationStoreState> {
    constructor() {
        super(CurrentLocationStore.getInitialState())
    }

    private static getInitialState(): CurrentLocationStoreState {
        return {
            enabled: false,
            tracking: false,
            hasPermission: null
        }
    }

    reduce(state: CurrentLocationStoreState, action: Action): CurrentLocationStoreState {
        if (action instanceof ToggleCurrentLocation) {
            return {
                ...state,
                enabled: action.enabled,
                tracking: action.enabled ? state.tracking : false
            }
        } else if (action instanceof ToggleLocationTracking) {
            return {
                ...state,
                tracking: action.tracking
            }
        } else if (action instanceof SetLocationPermission) {
            return {
                ...state,
                hasPermission: action.hasPermission
            }
        }
        return state
    }
}