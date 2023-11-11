import { Settings, defaultSettings } from '@/stores/SettingsStore'
import { createContext } from 'react'

export const SettingsContext = createContext<Settings>(defaultSettings)
