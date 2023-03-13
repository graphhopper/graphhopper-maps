import React from 'react'
import { Settings } from '@/stores/SettingsStore'
export const SettingsContext = React.createContext<Settings>({ showDistanceInMiles: false, showSettings: false })
