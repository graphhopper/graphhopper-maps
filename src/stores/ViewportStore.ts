import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { SetViewport, SetViewportToBbox, SetViewportToPoint } from '@/actions/Actions'
import { FlyToInterpolator, WebMercatorViewport } from 'react-map-gl'
import TransitionInterpolator from 'react-map-gl/src/utils/transition/transition-interpolator'

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
    constructor() {
        super()
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
                zoom: action.zoom
            }
        } else if (action instanceof SetViewportToBbox) {
            const bounds: [[number, number], [number, number]] = [
                [Math.max(-179, action.bbox[0]), Math.max(-89, action.bbox[1])],
                [Math.min(179, action.bbox[2]), Math.min(89, action.bbox[3])],
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
        return state
    }
}

function getPadding(width: number, height: number) {
    const padding = mediaQuery.matches
        ? {
              top: 250,
              bottom: 150,
              right: 16,
              left: 16,
          }
        : {
              top: 100,
              bottom: 100,
              right: 100,
              left: 500,
          }
    // we must not violate these assertions, otherwise WebMercatorViewport will throw an error
    if (padding.right + padding.left > width) padding.right = padding.left = 0
    if (padding.top + padding.bottom > height) padding.top = padding.bottom = 0
    return padding
}
