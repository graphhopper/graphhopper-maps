import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { ToggleDistanceUnits, TurnNavigationUpdate } from '@/actions/Actions'

export interface Settings {
    showDistanceInMiles: boolean
    fakeGPS: boolean
    acceptedRisk: boolean
    soundEnabled: boolean
}

export default class SettingsStore extends Store<Settings> {
    constructor() {
        super({
            showDistanceInMiles: false,
            fakeGPS: false,
            acceptedRisk: false,
            soundEnabled: false,
        })
    }

    reduce(state: Settings, action: Action): Settings {
        if (action instanceof ToggleDistanceUnits) {
            return {
                ...state,
                showDistanceInMiles: !state.showDistanceInMiles,
            }
        } else if (action instanceof TurnNavigationUpdate) {
            return { ...state, ...action.update }
        }
        return state
    }
}
