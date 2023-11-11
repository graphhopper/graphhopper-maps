import { Settings } from '@/stores/SettingsStore'
import { createContext } from 'react'

export const SettingsContext = createContext<Settings>({
    drawAreasEnabled: false,
    showDistanceInMiles: false,
})
