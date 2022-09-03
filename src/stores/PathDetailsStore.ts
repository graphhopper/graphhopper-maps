import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { PathDetailsElevationSelected, PathDetailsHover, PathDetailsRangeSelected } from '@/actions/Actions'
import { Coordinate } from '@/stores/QueryStore'
import { Bbox } from '@/api/graphhopper'

export interface PathDetailsPoint {
    point: Coordinate
    elevation: number
    description: string
}

export interface PathDetailsStoreState {
    pathDetailsPoint: PathDetailsPoint | null
    pathDetailBbox?: Bbox
    pathDetailsHighlightedSegments: Coordinate[][]
}

export default class PathDetailsStore extends Store<PathDetailsStoreState> {
    constructor() {
        super(PathDetailsStore.getInitialState())
    }

    private static getInitialState(): PathDetailsStoreState {
        return {
            pathDetailsPoint: null,
            pathDetailBbox: undefined,
            pathDetailsHighlightedSegments: [],
        }
    }

    reduce(state: PathDetailsStoreState, action: Action): PathDetailsStoreState {
        if (action instanceof PathDetailsHover) {
            return {
                ...state,
                pathDetailsPoint: action.pathDetailsPoint,
            }
        } else if (action instanceof PathDetailsRangeSelected) {
            return {
                ...state,
                pathDetailBbox: action.bbox ? action.bbox : undefined,
            }
        } else if (action instanceof PathDetailsElevationSelected) {
            return {
                // todo: we probably should keep the highlighted segments and elevation when we change the
                //       selected details?! -> need to fix in heightgraph
                ...state,
                pathDetailsHighlightedSegments: action.segments,
            }
        }
        return state
    }
}
