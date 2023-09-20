import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import {
    DrawCustomModelAreas,
    DrawHandfreeQueryPoints,
    SetCustomModelEnabled,
    ToggleDistanceUnits,
} from '@/actions/Actions'

export interface Settings {
    showDistanceInMiles: boolean
    drawAreasEnabled: boolean
    drawHandfreeQueryPointsEnabled: boolean
}

export default class SettingsStore extends Store<Settings> {
    constructor() {
        super({
            showDistanceInMiles: false,
            drawAreasEnabled: false,
            drawHandfreeQueryPointsEnabled: false,
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
        } else if (action instanceof DrawHandfreeQueryPoints) {
            return {
                ...state,
                drawHandfreeQueryPointsEnabled: action.enabled,
            }
        } else if (action instanceof DrawCustomModelAreas) {
            return {
                ...state,
                drawAreasEnabled: action.enabled,
            }
        }
        return state
    }
}
