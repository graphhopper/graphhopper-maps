import { Coordinate } from '@/stores/QueryStore'
import { Bbox } from '@/api/graphhopper'
import { StateCreator } from 'zustand'

export interface PathDetailsPoint {
    point: Coordinate
    elevation: number
    description: string
}

export interface PathDetailsSlice {
    pathDetailsPoint: PathDetailsPoint | null
    pathDetailsBbox?: Bbox
    pathDetailsHighlightedSegments: Coordinate[][]
    setPathDetailsPoint: (p : PathDetailsPoint | null) => void
    setPathDetailsBbox: (b: Bbox) => void
    setPathDetailsHighlightedSegments: (s: Coordinate[][]) => void
}

export const createPathDetailsSlice : StateCreator<PathDetailsSlice> = (set) => ({
    pathDetailsPoint: null,
    pathDetailsBbox: undefined,
    pathDetailsHighlightedSegments: [],
    setPathDetailsPoint: (p: PathDetailsPoint | null) => set(() => ({ pathDetailsPoint: p })),
    setPathDetailsBbox: (b: Bbox) => set(() => ({ pathDetailsBbox: b })),
    // todo: we probably should keep the highlighted segments and elevation when we change the
    // selected details?! -> need to fix in heightgraph
    setPathDetailsHighlightedSegments: (s: Coordinate[][]) => set(() => ({ pathDetailsHighlightedSegments: s }))
})
