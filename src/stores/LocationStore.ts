import { Coordinate } from '@/stores/QueryStore'
import Store from '@/stores/Store'
import { ErrorAction, LocationUpdate, SetViewportToPoint } from '@/actions/Actions'
import Dispatcher, { Action } from '@/stores/Dispatcher'
import NoSleep from 'nosleep.js'
import { SpeechSynthesizer } from '@/SpeechSynthesizer'
import { tr } from '@/translation/Translation'

export interface LocationStoreState {
    turnNavigation: boolean
    coordinate: Coordinate
}

export default class LocationStore extends Store<LocationStoreState> {
    private watchId: any = undefined
    private interval: any
    private noSleep: any
    private speechSynthesizer: SpeechSynthesizer
    private started: boolean = false

    constructor(speechSynthesizer: SpeechSynthesizer) {
        super()
        this.speechSynthesizer = speechSynthesizer
    }

    protected getInitialState(): LocationStoreState {
        return {
            turnNavigation: false,
            coordinate: { lat: 0, lng: 0 },
        }
    }

    reduce(state: LocationStoreState, action: Action): LocationStoreState {
        if (action instanceof LocationUpdate) {
            console.log('LocationUpdate {}', action)
            return {
                turnNavigation: action.turnNavigation,
                coordinate: action.coordinate,
            }
        }
        return state
    }

    // http://localhost:3000/?point=51.439291%2C14.245254&point=51.43322%2C14.234999&profile=car
    public initFake() {
        this.started = true
        this.speechSynthesizer.synthesize(tr('fake_welcome'))

        // TODO randomize a route
        const latlon: number[][] = [
            [51.439291, 14.245254, 180],
            [51.438989, 14.245405, 180],
            [51.438694, 14.245577, 90],
            [51.438668, 14.246092, 90],
            [51.438226, 14.246972, 180],
            [51.436795, 14.245921, 180],
            [51.435029, 14.243259, 270],
            [51.435203, 14.241006, 270],
            [51.434788, 14.238882, 180],
            [51.434146, 14.237745, 270],
            [51.433959, 14.235985, 180],
            [51.43322, 14.2349991, 270],
        ]
        let currentIndex: number = 0
        this.locationUpdate({
            coords: {
                latitude: latlon[currentIndex][0],
                longitude: latlon[currentIndex][1],
                heading: latlon[currentIndex][2],
            },
        })

        this.interval = setInterval(() => {
            currentIndex++
            currentIndex %= latlon.length
            console.log(currentIndex)
            this.locationUpdate({
                coords: {
                    latitude: latlon[currentIndex][0],
                    longitude: latlon[currentIndex][1],
                    heading: latlon[currentIndex][2],
                },
            })
        }, 3000)
    }

    private locationUpdate(pos: any) {
        console.log('locationUpdate = success handler')
        let c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        Dispatcher.dispatch(new LocationUpdate(c, true))
        let bearing: number = pos.coords.heading
        if (Number.isNaN(bearing)) bearing = 0
        Dispatcher.dispatch(new SetViewportToPoint(c, 17, 50, bearing))
    }

    public initReal() {
        try {
            let el = document.documentElement
            let requestFullscreenFct = el.requestFullscreen
            requestFullscreenFct.call(el)
        } catch (e) {
            console.log(e)
        }

        this.started = true
        if (!this.noSleep) this.noSleep = new NoSleep()
        this.noSleep.enable()
        if (!navigator.geolocation) {
            console.log('location not supported. In firefox I had to set geo.enabled=true in about:config')
        } else {
            console.log('location init')
            this.speechSynthesizer.synthesize(tr('welcome'))
            // force calling clearWatch can help to find GPS fix more reliable in android firefox
            if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId)

            let options = { enableHighAccuracy: false, timeout: 5000, maximumAge: 5000 }
            this.watchId = navigator.geolocation.watchPosition(
                this.locationUpdate,
                err => {
                    if (this.started) Dispatcher.dispatch(new ErrorAction('location watch error: ' + err.message))
                },
                options
            )
        }
    }

    public stop() {
        if (document.fullscreenElement) document.exitFullscreen()

        this.started = false
        if (this.interval) clearInterval(this.interval)

        if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId)

        // exit "navigation view" => use no pitch and no bearing (rotation)
        Dispatcher.dispatch(new SetViewportToPoint(this.state.coordinate, 15, 0, 0))

        // directly writing the state does not work: this.state.turnNavigation = false
        Dispatcher.dispatch(new LocationUpdate({ lat: 0, lng: 0 }, false))

        if (this.noSleep) this.noSleep.disable()

        console.log('stopped location updates ' + this.watchId + ', ' + this.interval)
    }
}
