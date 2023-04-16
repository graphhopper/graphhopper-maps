import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { DrawAreas, SetCustomModelEnabled, ToggleDistanceUnits } from '@/actions/Actions'

export interface Settings {
    showDistanceInMiles: boolean
    drawAreasEnabled: boolean
}

export default class SettingsStore extends Store<Settings> {
    constructor() {
        super({
            showDistanceInMiles: false,
            drawAreasEnabled: false,
        })
    }

    reduce(state: Settings, action: Action): Settings {
        if (action instanceof ToggleDistanceUnits) {
            return {
                ...state,
                showDistanceInMiles: !state.showDistanceInMiles,
            }
        } else if (action instanceof SetCustomModelEnabled) {
            if (!action.enabled && state.drawAreasEnabled)
                return {
                    ...state,
                    drawAreasEnabled: false,
                }
        } else if (action instanceof DrawAreas) {
            return {
                ...state,
                drawAreasEnabled: action.enabled,
            }
        }
        return state
    }
}
