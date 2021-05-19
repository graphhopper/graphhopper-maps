import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { PathDetailsElevationSelected, PathDetailsHover, PathDetailsRangeSelected } from '@/actions/Actions'
import { Coordinate } from '@/stores/QueryStore'
import { Bbox } from '@/api/graphhopper'

export interface PathDetailsPoint {
    point: Coordinate
    elevation: string
    description: string
}

export interface PathDetailsStoreState {
    pathDetailsPoint: PathDetailsPoint | null
    pathDetailBbox?: Bbox
    pathDetailsHighlightedSegments: Coordinate[][]
}

export default class PathDetailsStore extends Store<PathDetailsStoreState> {
    constructor() {
        super()
    }

    protected getInitialState(): PathDetailsStoreState {
        return {
            pathDetailsPoint: null,
            pathDetailBbox: undefined,
            pathDetailsHighlightedSegments: []
        }
    }


    reduce(state: PathDetailsStoreState, action: Action): PathDetailsStoreState {
        if (action instanceof PathDetailsHover) {
            return {
                ...state,
                pathDetailsPoint: action.pathDetailsPoint
            }
        } else if (action instanceof PathDetailsRangeSelected) {
            return {
                // todo: bug - when we change details and selected a range before and then zoomed somewhere else we jump
                //       back to the box unintentionally
                ...state,
                pathDetailBbox: action.bbox
            }
        } else if (action instanceof PathDetailsElevationSelected) {
            return {
                // todo: bug - we probably should keep the the highlighted segments and elevation when we change the
                //       selected details?!
                ...state,
                pathDetailsHighlightedSegments: action.segments
            }
        }
        return state
    }
}
