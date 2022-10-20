import create from 'zustand'
import { createPathDetailsSlice, PathDetailsSlice } from '@/stores/pathDetailsSlice'
import { createSettingsSlice, SettingsSlice } from '@/stores/settingsSlice'

// todo: not sure about the name yet, because there is also zustand/useStore...
export const useStore = create<PathDetailsSlice & SettingsSlice>((...a) => ({
    ...createPathDetailsSlice(...a),
    ...createSettingsSlice(...a),
}))
