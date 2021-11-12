import Store from '@/stores/Store'
import Dispatcher, { Action } from '@/stores/Dispatcher'
import { Map, View } from 'ol'
import { fromLonLat } from 'ol/proj'
import {
    InfoReceived,
    MapIsLoaded,
    PathDetailsRangeSelected,
    RouteRequestSuccess,
    SetSelectedPath,
    ZoomMapToPoint,
} from '@/actions/Actions'
import RouteStore from '@/stores/RouteStore'
import { Bbox } from '@/api/graphhopper'

export interface MapStoreState {
    map: Map
}

export default class MapStore extends Store<MapStoreState> {
    private readonly routeStore: RouteStore
    private readonly isSmallScreenQuery: () => boolean

    constructor(routeStore: RouteStore, isSmallScreenQuery: () => boolean) {
        super()
        this.routeStore = routeStore
        this.isSmallScreenQuery = isSmallScreenQuery
    }

    protected getInitialState(): MapStoreState {
        const map = new Map({
            view: new View({
                multiWorld: false,
                constrainResolution: true,
                // todo: initial values do not really matter, because we immediately update the state?!..
                center: fromLonLat([11, 48]),
                zoom: 5,
            }),
            controls: [],
        })
        map.once('postrender', () => {
            Dispatcher.dispatch(new MapIsLoaded())
        })
        return {
            map,
        }
    }

    reduce(state: MapStoreState, action: Action): MapStoreState {
        // todo: port old ViewportStore.test.ts or otherwise test this
        const isSmallScreen = this.isSmallScreenQuery()
        if (action instanceof ZoomMapToPoint) {
            state.map.getView().setCenter(fromLonLat([action.coordinate.lng, action.coordinate.lat]))
            state.map.getView().setZoom(action.zoom)
        } else if (action instanceof InfoReceived) {
            fitBounds(state.map, action.result.bbox, isSmallScreen)
        } else if (action instanceof RouteRequestSuccess) {
            // todo: is this comment still valid?
            // this assumes that always the first path is selected as result. One could use the
            // state of the routeStore as well but then we would have to make sure that the route
            // store digests this action first, which our Dispatcher can't at the moment.
            fitBounds(state.map, action.result.paths[0].bbox!, isSmallScreen)
        } else if (action instanceof SetSelectedPath) {
            fitBounds(state.map, action.path.bbox!, isSmallScreen)
        } else if (action instanceof PathDetailsRangeSelected) {
            // we either use the bbox from the path detail selection or go back to the route bbox when the path details
            // were deselected
            const bbox = action.bbox ? action.bbox : this.routeStore.state.selectedPath.bbox
            if (bbox) fitBounds(state.map, bbox, isSmallScreen)
            // if neither has a bbox just fall through to unchanged state
        }
        return state
    }
}

function fitBounds(map: Map, bbox: Bbox, isSmallScreen: boolean) {
    const sw = fromLonLat([bbox[0], bbox[1]])
    const ne = fromLonLat([bbox[2], bbox[3]])
    map.getView().fit([sw[0], sw[1], ne[0], ne[1]], {
        padding: isSmallScreen ? [200, 16, 32, 16] : [100, 100, 300, 500],
        // todo: advanced transition like transition easing, interpolation, duration=auto etc.?
        duration: 500,
    })
}
