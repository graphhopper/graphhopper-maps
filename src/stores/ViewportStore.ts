import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import {
    PathDetailsRangeSelected,
    RouteRequestSuccess,
    SetSelectedPath,
    SetViewport,
    SetViewportToPoint,
} from '@/actions/Actions'
import { WebMercatorViewport } from 'react-map-gl'
import TransitionInterpolator from 'react-map-gl/src/utils/transition/transition-interpolator'
import { Bbox } from '@/api/graphhopper'
import RouteStore from '@/stores/RouteStore'

export interface ViewportStoreState {
    longitude: number
    latitude: number
    zoom: number
    width: number
    height: number
    altitude?: number
    bearing?: number
    minZoom?: number
    maxZoom?: number
    minPitch?: number
    maxPitch?: number
    transitionDuration?: number
    transitionEasing?: Function
    transitionInterpolator?: TransitionInterpolator
    transitionInterruption?: number
}

export default class ViewportStore extends Store<ViewportStoreState> {
    private readonly routeStore: RouteStore
    private readonly isSmallScreenQuery: () => boolean

    constructor(routeStore: RouteStore, initialBBox: Bbox | null, isSmallScreenQuery: () => boolean) {
        super()
        this.routeStore = routeStore
        this.isSmallScreenQuery = isSmallScreenQuery
        if (initialBBox) {
            const updatedState = calculateLatLngFromBbox(this.state, initialBBox, isSmallScreenQuery())
            super.setState(updatedState)
        }
    }

    protected getInitialState(): ViewportStoreState {
        return {
            width: window.screen.width,
            height: window.screen.height,
            longitude: 10,
            latitude: 10,
            zoom: 2,
        } as ViewportStoreState
    }
    reduce(state: ViewportStoreState, action: Action): ViewportStoreState {
        const isSmallScreen = this.isSmallScreenQuery()
        if (action instanceof SetViewport) {
            return action.viewport
        } else if (action instanceof SetViewportToPoint) {
            return {
                ...state,
                longitude: action.coordinate.lng,
                latitude: action.coordinate.lat,
                zoom: action.zoom,
            }
        } else if (action instanceof RouteRequestSuccess) {
            // this assumes that always the first path is selected as result. One could use the
            // state of the routeStore as well but then we would have to make sure that the route
            // store digests this action first, which our Dispatcher can't at the moment.
            return calculateLatLngFromBbox(state, action.result.paths[0].bbox!, isSmallScreen)
        } else if (action instanceof SetSelectedPath) {
            return calculateLatLngFromBbox(state, action.path.bbox!, isSmallScreen)
        } else if (action instanceof PathDetailsRangeSelected) {
            // we either use the bbox from the path detail selection or go back to the route bbox when the path details
            // were deselected
            const bbox = action.bbox ? action.bbox : this.routeStore.state.selectedPath.bbox
            if (bbox) return calculateLatLngFromBbox(state, bbox, isSmallScreen)
            // if neither has a bbox just fall through to unchanged state
        }
        return state
    }
}

function calculateLatLngFromBbox(state: ViewportStoreState, bbox: Bbox, isSmallScreen: boolean): ViewportStoreState {
    const bounds: [[number, number], [number, number]] = [
        [Math.max(-179, bbox[0]), Math.max(-89, bbox[1])],
        [Math.min(179, bbox[2]), Math.min(89, bbox[3])],
    ]
    const { longitude, latitude, zoom } = new WebMercatorViewport({
        width: state.width,
        height: state.height,
    }).fitBounds(bounds, {
        padding: getPadding(state.width, state.height, isSmallScreen),
    })
    return {
        ...state,
        longitude,
        latitude,
        // for some reason fitbounds can return zoom < 0 and the map is not visible when we load the map without path
        zoom: Math.max(0, zoom),
    }
}

function getPadding(width: number, height: number, isSmallScreen: boolean) {
    const padding = isSmallScreen
        ? {
              top: 200,
              bottom: 32,
              right: 16,
              left: 16,
          }
        : {
              top: 100,
              bottom: 300,
              right: 100,
              left: 500,
          }
    // we must not violate these assertions, otherwise WebMercatorViewport will throw an error
    if (padding.right + padding.left > width) padding.right = padding.left = 0
    if (padding.top + padding.bottom > height) padding.top = padding.bottom = 0
    return padding
}
