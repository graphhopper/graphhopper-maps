import React from 'react'
import { Settings } from '@/stores/SettingsStore'
export const ShowDistanceInMilesContext = React.createContext<Settings>({
    showDistanceInMiles: false,
})
