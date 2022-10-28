import { Action, ActionReceiver } from '@/stores/Dispatcher'
import { Map } from 'ol'
import { fromLonLat } from 'ol/proj'
import {
    InfoReceived,
    PathDetailsRangeSelected,
    RouteRequestSuccess,
    SetInitialBBox,
    SetSelectedPath,
    ZoomMapToPoint,
} from '@/actions/Actions'
import RouteStore from '@/stores/RouteStore'
import { Bbox } from '@/api/graphhopper'
import { toRadians } from 'ol/math'

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
            // we estimate the map size to be equal to the window size. we don't know better at this point, because
            // the map has not been rendered for the first time yet
            fitBounds(this.map, action.bbox, isSmallScreen, [window.innerWidth, window.innerHeight])
        } else if (action instanceof ZoomMapToPoint) {
            // if navigating move to the lower half
            if (action.navigationOffset) {
                const size = this.map.getSize() // [width, height]
                this.map.getView().padding = [size ? size[1] / 2 : 0, 0, 0, 0]
            }

            // The heading is in degrees and shows direction into which device is going.
            // And although in openlayers docs they say rotation is clockwise it seems to be CCW or just a different view port definition.
            const rotation =
                !action.heading || Number.isNaN(action.heading)
                    ? this.map.getView().getRotation()
                    : -toRadians(action.heading)
            this.map.getView().animate({
                zoom: action.zoom,
                center: fromLonLat([action.coordinate.lng, action.coordinate.lat]),
                rotation: rotation,
                duration: 400,
            })
        } else if (action instanceof RouteRequestSuccess) {
            // this assumes that always the first path is selected as result. One could use the
            // state of the routeStore as well, but then we would have to make sure that the route
            // store digests this action first, which our Dispatcher can't at the moment.
            const bbox = action.result.paths[0].bbox!
            // minLon, minLat, maxLon, maxLat
            const widerBBox = [bbox[0], bbox[1], bbox[2], bbox[3]] as Bbox
            action.request.points.forEach(p => {
                widerBBox[0] = Math.min(p[0], widerBBox[0])
                widerBBox[1] = Math.min(p[1], widerBBox[1])
                widerBBox[2] = Math.max(p[0], widerBBox[2])
                widerBBox[3] = Math.max(p[1], widerBBox[3])
            })
            if (widerBBox[2] - widerBBox[0] < 0.001) {
                widerBBox[0] -= 0.0005
                widerBBox[2] += 0.0005
            }
            if (widerBBox[3] - widerBBox[1] < 0.001) {
                widerBBox[1] -= 0.0005
                widerBBox[3] += 0.0005
            }
            if (action.request.zoom) fitBounds(this.map, widerBBox, isSmallScreen)
        } else if (action instanceof SetSelectedPath) {
            fitBounds(this.map, action.path.bbox!, isSmallScreen)
        } else if (action instanceof PathDetailsRangeSelected) {
            // we either use the bbox from the path detail selection or go back to the route bbox when the path details
            // were deselected
            const bbox = action.bbox ? action.bbox : this.routeStore.state.selectedPath.bbox
            if (bbox) fitBounds(this.map, bbox, isSmallScreen)
            // if neither has a bbox just fall through to unchanged state
        } else if (action instanceof InfoReceived) {
            if (JSON.stringify(action.result.bbox) === '[-180,-90,180,90]') {
                // we play it safe in terms of initial page loading time and do nothing...
            } else {
                fitBounds(this.map, action.result.bbox, isSmallScreen)
            }
        }
    }
}

function fitBounds(map: Map, bbox: Bbox, isSmallScreen: boolean, mapSize?: number[]) {
    const sw = fromLonLat([bbox[0], bbox[1]])
    const ne = fromLonLat([bbox[2], bbox[3]])
    map.getView().fit([sw[0], sw[1], ne[0], ne[1]], {
        size: mapSize ? mapSize : map.getSize(),
        padding: isSmallScreen ? [200, 16, 32, 16] : [100, 100, 300, 500],
    })
}
