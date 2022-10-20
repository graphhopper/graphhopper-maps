import { StateCreator } from 'zustand'

export interface SettingsSlice {
    showDistanceInMiles: boolean
    toggleDistanceUnits: () => void
}

export const createSettingsSlice: StateCreator<SettingsSlice> = set => ({
    showDistanceInMiles: false,
    toggleDistanceUnits: () => set(state => ({ showDistanceInMiles: !state.showDistanceInMiles })),
})
