import create from 'zustand'
import { createPathDetailsSlice, PathDetailsSlice } from '@/stores/pathDetailsSlice'

export const useStore = create<PathDetailsSlice>((...a) => ({
    ...createPathDetailsSlice(...a)
}))