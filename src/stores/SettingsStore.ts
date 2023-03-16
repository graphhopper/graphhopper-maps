import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { SetCustomModel, SetCustomModelBoxEnabled, ToggleDistanceUnits, ToggleShowSettings } from '@/actions/Actions'
import React from 'react'
import { CustomModel } from '@/stores/QueryStore'

export interface Settings {
    showDistanceInMiles: boolean
    showSettings: boolean
    customModel: CustomModel | null
    customModelValid: boolean
    customModelEnabled: boolean
    initialCustomModelStr: string | null
}

export const SettingsContext = React.createContext<Settings>({
    showDistanceInMiles: false,
    showSettings: false,
    customModel: null,
    customModelValid: false,
    customModelEnabled: false,
    initialCustomModelStr: '',
})

export default class SettingsStore extends Store<Settings> {
    constructor(initialCustomModelStr: string | null = null) {
        super({
            showDistanceInMiles: false,
            showSettings: false,
            customModel: null,
            customModelValid: false,
            customModelEnabled: initialCustomModelStr != null,
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
