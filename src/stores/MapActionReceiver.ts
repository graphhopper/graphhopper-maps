import Dispatcher, { Action, ActionReceiver } from '@/stores/Dispatcher'
import { Map, View } from 'ol'
import { fromLonLat } from 'ol/proj'
import {
    MapIsLoaded,
    PathDetailsRangeSelected,
    RouteRequestSuccess,
    SetInitialBBox,
    SetSelectedPath,
    ZoomMapToPoint,
} from '@/actions/Actions'
import RouteStore from '@/stores/RouteStore'
import { Bbox } from '@/api/graphhopper'

export default class MapActionReceiver implements ActionReceiver {
    readonly map: Map
    private readonly routeStore: RouteStore
    private readonly isSmallScreenQuery: () => boolean

    constructor(map: Map, routeStore: RouteStore, isSmallScreenQuery: () => boolean) {
        this.map = map
        this.routeStore = routeStore
        this.isSmallScreenQuery = isSmallScreenQuery
    }

    receive(action: Action) {
        // todo: port old ViewportStore.test.ts or otherwise test this
        const isSmallScreen = this.isSmallScreenQuery()
        if (action instanceof SetInitialBBox) {
            fitBounds(this.map, action.bbox, isSmallScreen)
        } else if (action instanceof ZoomMapToPoint) {
            this.map.getView().setCenter(fromLonLat([action.coordinate.lng, action.coordinate.lat]))
            this.map.getView().setZoom(action.zoom)
        } else if (action instanceof RouteRequestSuccess) {
            // this assumes that always the first path is selected as result. One could use the
            // state of the routeStore as well but then we would have to make sure that the route
            // store digests this action first, which our Dispatcher can't at the moment.
            fitBounds(this.map, action.result.paths[0].bbox!, isSmallScreen)
        } else if (action instanceof SetSelectedPath) {
            fitBounds(this.map, action.path.bbox!, isSmallScreen)
        } else if (action instanceof PathDetailsRangeSelected) {
            // we either use the bbox from the path detail selection or go back to the route bbox when the path details
            // were deselected
            const bbox = action.bbox ? action.bbox : this.routeStore.state.selectedPath.bbox
            if (bbox) fitBounds(this.map, bbox, isSmallScreen)
            // if neither has a bbox just fall through to unchanged state
        }
    }
}

function fitBounds(map: Map, bbox: Bbox, isSmallScreen: boolean) {
    const sw = fromLonLat([bbox[0], bbox[1]])
    const ne = fromLonLat([bbox[2], bbox[3]])
    map.getView().fit([sw[0], sw[1], ne[0], ne[1]], {
        padding: isSmallScreen ? [200, 16, 32, 16] : [100, 100, 300, 500],
    })
}
