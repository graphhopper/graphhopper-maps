import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { SetCustomModelEnabled, UpdateSettings } from '@/actions/Actions'

const STORAGE_KEY = 'settings'

export interface Settings {
    showDistanceInMiles: boolean
    drawAreasEnabled: boolean // temporary, not persisted to localStorage
    gpxExportRte: boolean
    gpxExportWpt: boolean
    gpxExportTrk: boolean
}

export const defaultSettings: Settings = {
    showDistanceInMiles: false,
    drawAreasEnabled: false,
    gpxExportRte: false,
    gpxExportWpt: false,
    gpxExportTrk: true,
}

function loadSettings(): Settings {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) return { ...defaultSettings, ...JSON.parse(stored) }
    } catch {
        // localStorage unavailable
    }
    return defaultSettings
}

function saveSettings(settings: Settings): void {
    try {
        const { drawAreasEnabled, ...persistent } = settings
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persistent))
    } catch {
        // localStorage unavailable
    }
}

export default class SettingsStore extends Store<Settings> {
    constructor() {
        super(loadSettings())
    }

    reduce(state: Settings, action: Action): Settings {
        let newState = state
        if (action instanceof SetCustomModelEnabled) {
            if (!action.enabled && state.drawAreasEnabled)
                newState = {
                    ...state,
                    drawAreasEnabled: false,
                }
        } else if (action instanceof UpdateSettings) {
            newState = {
                ...state,
                ...action.updatedSettings,
            }
        }
        if (newState !== state) saveSettings(newState)
        return newState
    }
}
