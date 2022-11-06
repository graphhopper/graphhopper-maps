import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { ToggleDistanceUnits } from '@/actions/Actions'

export interface Settings {
    showDistanceInMiles: boolean
}

export default class SettingsStore extends Store<Settings> {
    constructor() {
        super({
            showDistanceInMiles: false,
        })
    }

    reduce(state: Settings, action: Action): Settings {
        if (action instanceof ToggleDistanceUnits) {
            return {
                ...state,
                showDistanceInMiles: !state.showDistanceInMiles,
            }
        }
        return state
    }
}
