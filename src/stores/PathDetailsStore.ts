import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import {
    ClearPoints,
    ClearRoute,
    PathDetailsElevationSelected,
    PathDetailsHover,
    PathDetailsRangeSelected,
    RouteRequestSuccess,
    SetActiveDetail,
} from '@/actions/Actions'
import { Bbox } from '@/api/graphhopper'
import { Coordinate } from '@/utils'
import { ChartPathDetail } from '@/pathDetails/elevationWidget/types'

export interface PathDetailsPoint {
    point: Coordinate
    elevation: number
    description: string
}

export interface PathDetailsStoreState {
    pathDetailsPoint: PathDetailsPoint | null
    pathDetailBbox?: Bbox
    pathDetailsHighlightedSegments: Coordinate[][]
    activeDetail: ChartPathDetail | null
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
            activeDetail: null,
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
        } else if (action instanceof ClearRoute || action instanceof ClearPoints) {
            return PathDetailsStore.getInitialState()
        } else if (action instanceof RouteRequestSuccess) {
            // Clear stale overlay when a new route arrives; ElevationInfoBar will
            // restore it from the persisted selected key if still applicable.
            if (!state.activeDetail) return state
            return {
                ...state,
                activeDetail: null,
                pathDetailsHighlightedSegments: [],
            }
        } else if (action instanceof SetActiveDetail) {
            // Important: return the same state reference when the detail hasn't changed, otherwise the
            // spread creates a new object on every dispatch, triggering a re-render loop via Store's
            // reference equality check.
            if (action.detail === state.activeDetail) return state
            return {
                ...state,
                activeDetail: action.detail,
            }
        }
        return state
    }
}
