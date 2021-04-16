import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { Coordinate, QueryPointType } from '@/stores/QueryStore'
import { SetCurrentLocation, SetNavigationStart, RouteRequestSuccess } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'

export interface CurrentLocationState {
    readonly coordinate: Coordinate
}

export default class CurrentLocationStore extends Store<CurrentLocationState> {
    private initialized : boolean = false
    private watchId : number = 0

    reduce(state: CurrentLocationState, action: Action): CurrentLocationState {
        if (action instanceof RouteRequestSuccess) {
            console.log("TODO NOW trigger SetNavigationStart due to route update: ", action)

        } else if (action instanceof SetCurrentLocation) {
            const dist = CurrentLocationStore.distCalc(state.coordinate.lat, state.coordinate.lng, action.coordinate.lat, action.coordinate.lng)
            console.log("location new state. distance: " + dist+ " state:", state)
            if(dist > 10)
                Dispatcher.dispatch(new SetNavigationStart(action.coordinate))
            return { coordinate: action.coordinate } as CurrentLocationState
        }
        return state;
    }

    init() {
        if (!navigator.geolocation) {
            console.log("location not supported. In firefox I had to set geo.enabled=true in about:config")
        } else {
            console.log("location init")

            if(this.initialized) navigator.geolocation.clearWatch(this.watchId)

            var success = function(pos: any) {
                const coords : Coordinate = {lng: pos.coords.longitude, lat: pos.coords.latitude }
                Dispatcher.dispatch(new SetCurrentLocation(coords, pos.coords.heading, pos.coords.speed))
            }
            var options = { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
            this.watchId = navigator.geolocation.watchPosition(success, function(err) { console.log("error", err);}, options)
            this.initialized = true
        }
    }

    protected getInitialState(): CurrentLocationState {
        return {
            coordinate: { lng: 0, lat: 0 } as Coordinate
        }
    }

    public static distCalc(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
        const sinDeltaLat : number = Math.sin(this.toRadians(toLat - fromLat) / 2)
        const sinDeltaLon : number = Math.sin(this.toRadians(toLng - fromLng) / 2)
        const normedDist : number = sinDeltaLat * sinDeltaLat + sinDeltaLon * sinDeltaLon * Math.cos(this.toRadians(fromLat)) * Math.cos(this.toRadians(toLat))
        return 6371000 * 2 * Math.asin(Math.sqrt(normedDist))
    }

    private static toRadians(deg: number): number {
        return deg * Math.PI / 180.0;
    }
}