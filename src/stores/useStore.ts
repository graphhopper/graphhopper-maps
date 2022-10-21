import createVanilla from 'zustand/vanilla'

import create from 'zustand'
import { createPathDetailsSlice, PathDetailsSlice } from '@/stores/pathDetailsSlice'
import { createSettingsSlice, SettingsSlice } from '@/stores/settingsSlice'
import { createMapOptionsSlice, MapOptionsSlice } from '@/stores/mapOptionsSlice'
import { createMapFeatureSlice, MapFeatureSlice } from '@/stores/mapFeatureSlice'
import { createMapSlice, MapSlice } from '@/map/mapSlice'

export type AppStoreState = PathDetailsSlice & SettingsSlice & MapOptionsSlice & MapFeatureSlice & MapSlice

// this is only exported for unit tests
export const createAppStore = () =>
    createVanilla<AppStoreState>((...a) => ({
        ...createPathDetailsSlice(...a),
        ...createSettingsSlice(...a),
        ...createMapOptionsSlice(...a),
        ...createMapFeatureSlice(...a),
        ...createMapSlice(...a),
    }))

// todo: not sure about the name yet, because there is also zustand/useStore...
export const store = createAppStore()

export const useStore = create(store)
