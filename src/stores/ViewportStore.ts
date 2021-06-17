import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import {
    InfoReceived,
    PathDetailsRangeSelected,
    RouteRequestSuccess,
    SetSelectedPath,
    SetViewport,
    SetViewportToPoint,
} from '@/actions/Actions'
import { FlyToInterpolator, WebMercatorViewport } from 'react-map-gl'
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

// have this right here for now. Not sure if this needs to be abstracted somewhere else
const mediaQuery = window.matchMedia('(max-width: 640px)')

export default class ViewportStore extends Store<ViewportStoreState> {
    private readonly routeStore: RouteStore

    constructor(routeStore: RouteStore) {
        super()
        this.routeStore = routeStore
    }

    protected getInitialState(): ViewportStoreState {
        return {
            // todo: initial values do not really matter, because we immediately update the state?!..
            width: 800,
            height: 600,
            longitude: 11,
            latitude: 48,
            zoom: 5,
        }
    }
    reduce(state: ViewportStoreState, action: Action): ViewportStoreState {
        if (action instanceof SetViewport) {
            return action.viewport
        } else if (action instanceof SetViewportToPoint) {
            return {
                ...state,
                longitude: action.coordinate.lng,
                latitude: action.coordinate.lat,
                zoom: action.zoom,
            }
        } else if (action instanceof InfoReceived) {
            return calculateLatLngFromBbox(state, action.result.bbox)
        } else if (action instanceof RouteRequestSuccess) {
            // this assumes that always the first path is selected as result. One could use the
            // state of the routeStore as well but then we would have to make sure that the route
            // store digests this action first, which our Dispatcher can't at the moment.
            return calculateLatLngFromBbox(state, action.result.paths[0].bbox!)
        } else if (action instanceof SetSelectedPath) {
            return calculateLatLngFromBbox(state, action.path.bbox!)
        } else if (action instanceof PathDetailsRangeSelected) {
            // take bbox from actio or from selected path
            const bbox = action.bbox ? action.bbox : this.routeStore.state.selectedPath.bbox
            // if neither has a bbox just fall through to unchanged state
            if (bbox) return calculateLatLngFromBbox(state, bbox)
        }
        return state
    }
}

function calculateLatLngFromBbox(state: ViewportStoreState, bbox: Bbox): ViewportStoreState {
    const bounds: [[number, number], [number, number]] = [
        [Math.max(-179, bbox[0]), Math.max(-89, bbox[1])],
        [Math.min(179, bbox[2]), Math.min(89, bbox[3])],
    ]
    const { longitude, latitude, zoom } = new WebMercatorViewport({
        width: state.width,
        height: state.height,
    }).fitBounds(bounds, {
        padding: getPadding(state.width, state.height),
    })
    return {
        ...state,
        longitude,
        latitude,
        transitionDuration: 500,
        transitionInterpolator: new FlyToInterpolator(),
        // there is also this option:
        // transitionEasing: (t : any) => t,
        // todo: we could also use speed/auto instead
        // transitionInterpolator: new FlyToInterpolator({speed: 1.2}),
        // transitionDuration: 'auto'
        // todo: for some reason fitbounds can return zoom < 0 and the map is not visible when we load the
        //       map without path
        zoom: Math.max(0, zoom),
    }
}

function getPadding(width: number, height: number) {
    const padding = mediaQuery.matches
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
