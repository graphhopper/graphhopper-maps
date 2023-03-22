import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { ToggleDistanceUnits, ToggleShowSettings } from '@/actions/Actions'

export interface Settings {
    showDistanceInMiles: boolean
    showSettings: boolean
}

export default class SettingsStore extends Store<Settings> {
    constructor() {
        super({
            showDistanceInMiles: false,
            showSettings: false,
        })
    }

    reduce(state: Settings, action: Action): Settings {
        if (action instanceof ToggleDistanceUnits) {
            return {
                ...state,
                showDistanceInMiles: !state.showDistanceInMiles,
            }
        } else if (action instanceof ToggleShowSettings) {
            return {
                ...state,
                showSettings: !state.showSettings,
            }
        }
        return state
    }
}
