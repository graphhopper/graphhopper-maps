import { Coordinate } from '@/stores/QueryStore'
import Store from '@/stores/Store'
import { LocationUpdate } from '@/actions/Actions'
import Dispatcher, { Action } from '@/stores/Dispatcher'

export interface LocationStoreState {
    turnNavigation: boolean
    coordinate: Coordinate
}

export default class LocationStore extends Store<LocationStoreState> {
    
    private watchId : any
    private interval: any

    protected getInitialState(): LocationStoreState {
        return {
            turnNavigation: false,
            coordinate: {lat: 0, lng: 0}
        }
    }

    reduce(state: LocationStoreState, action: Action): LocationStoreState {
        if(action instanceof LocationUpdate) {
            return {
                turnNavigation: action.turnNavigation,
                coordinate: action.coordinate,
            }
        }
        return state
    }

    // http://localhost:3000/?point=51.439291%2C14.245254&point=51.43322%2C14.234999&profile=car
    public initFake() {
        // TODO randomize a route
        const latlon: number[][] = [
            [51.439291,14.245254],
        [51.438989,14.245405],
        [51.438694,14.245577],
        [51.438668,14.246092],
        [51.438226,14.246972],
        [51.436795,14.24592],
        [51.435029,14.243259],
        [51.435203,14.241006],
        [51.434788,14.238882],
        [51.434146,14.237745],
        [51.433959,14.235985],
        [51.43322,14.234999]]
        var currentIndex: number = 0;

        Dispatcher.dispatch(new LocationUpdate({lat: latlon[currentIndex][0], lng: latlon[currentIndex][1] }, true))

        this.interval = setInterval(() => {
            currentIndex++
            currentIndex %= latlon.length
            Dispatcher.dispatch(new LocationUpdate({lat: latlon[currentIndex][0], lng: latlon[currentIndex][1] }, true))
        }, 3000);
    }

    public initReal() {
         if (!navigator.geolocation) {
            console.log("location not supported. In firefox I had to set geo.enabled=true in about:config")
        } else {
            console.log("location init")

            // force calling clearWatch can help to find GPS fix more reliable in android firefox
            if(this.watchId)
                navigator.geolocation.clearWatch(this.watchId)

            var success = (pos: any) => {
                console.log("location success handler start")
                Dispatcher.dispatch(new LocationUpdate({lat: pos.coords.latitude, lng: pos.coords.longitude }, true))
            }
            var options = { enableHighAccuracy: false, timeout: 5000, maximumAge: 5000 }
            this.watchId = navigator.geolocation.watchPosition(success, function(err) { console.log("location watch error", err);}, options)
        }

        // TODO NOW
        // if(!this.noSleep) {
        //    this.noSleep = new NoSleep();
        //    this.noSleep.enable()
        // }
    }

    public stop() {
        if(this.interval)
            clearInterval(this.interval);

        if(this.watchId)
            navigator.geolocation.clearWatch(this.watchId)

        // directly writing the state does not work: this.state.turnNavigation = false
        Dispatcher.dispatch(new LocationUpdate({lat: 0, lng: 0 }, false))

        console.log("stopped location updates")
    }
}
