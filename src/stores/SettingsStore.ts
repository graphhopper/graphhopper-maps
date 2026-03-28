import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { SetCustomModelEnabled, UpdateSettings } from '@/actions/Actions'

export interface Settings {
    showDistanceInMiles: boolean
    drawAreasEnabled: boolean
    saveRecentLocations: boolean
    gpxExportRte: boolean
    gpxExportWpt: boolean
    gpxExportTrk: boolean
}

export const defaultSettings: Settings = {
    showDistanceInMiles: false,
    drawAreasEnabled: false,
    saveRecentLocations: true,
    gpxExportRte: false,
    gpxExportWpt: false,
    gpxExportTrk: true,
}

export default class SettingsStore extends Store<Settings> {
    constructor() {
        super(defaultSettings)
    }

    reduce(state: Settings, action: Action): Settings {
        if (action instanceof SetCustomModelEnabled) {
            if (!action.enabled && state.drawAreasEnabled)
                return {
                    ...state,
                    drawAreasEnabled: false,
                }
        } else if (action instanceof UpdateSettings) {
            return {
                ...state,
                ...action.updatedSettings,
            }
        }
        return state
    }
}
