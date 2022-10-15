import create from 'zustand'
import { Coordinate } from '@/stores/QueryStore'
import { Bbox } from '@/api/graphhopper'

export interface PathDetailsPoint {
    point: Coordinate
    elevation: number
    description: string
}

interface PathDetailsState {
    pathDetailsPoint: PathDetailsPoint | null
    pathDetailBbox?: Bbox
    pathDetailsHighlightedSegments: Coordinate[][]
}

export const usePathDetailsStore = create<PathDetailsState>(() => ({
    pathDetailsPoint: null,
    pathDetailBbox: undefined,
    pathDetailsHighlightedSegments: [],
}))

export const setPoint = (p: PathDetailsPoint | null) => usePathDetailsStore.setState(() => ({ pathDetailsPoint: p }))
export const setBbox = (b: Bbox) => usePathDetailsStore.setState(() => ({ pathDetailBbox: b }))
// todo: we probably should keep the highlighted segments and elevation when we change the
// selected details?! -> need to fix in heightgraph
export const setHighlightedSegments = (s: Coordinate[][]) =>
    usePathDetailsStore.setState(() => ({ pathDetailsHighlightedSegments: s }))
