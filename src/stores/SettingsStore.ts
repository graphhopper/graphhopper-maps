import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { SetCustomModel, SetCustomModelBoxEnabled, ToggleDistanceUnits, ToggleShowSettings } from '@/actions/Actions'
import { CustomModel } from '@/stores/QueryStore'

export interface Settings {
    showDistanceInMiles: boolean
    showSettings: boolean
    customModel: CustomModel | null
    customModelValid: boolean
    customModelEnabled: boolean
    initialCustomModelStr: string | null
}

export default class SettingsStore extends Store<Settings> {
    constructor(initialCustomModelStr: string | null = null) {
        super({
            showDistanceInMiles: false,
            showSettings: false,
            customModel: null, // initialCustomModelStr will be parsed later. We cannot report errors that early.
            customModelValid: false,
            customModelEnabled: !!initialCustomModelStr,
            initialCustomModelStr: initialCustomModelStr,
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
        } else if (action instanceof SetCustomModelBoxEnabled) {
            return {
                ...state,
                customModelEnabled: !this.state.customModelEnabled,
            }
        } else if (action instanceof SetCustomModel) {
            return {
                ...state,
                customModel: action.customModel,
                customModelValid: action.valid,
            }
        }
        return state
    }
}
