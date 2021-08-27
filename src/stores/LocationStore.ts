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
    speed: number
}

export default class LocationStore extends Store<LocationStoreState> {
    private watchId: any = undefined
    private interval: any
    private noSleep: any
    private readonly speechSynthesizer: SpeechSynthesizer
    private started: boolean = false

    constructor(speechSynthesizer: SpeechSynthesizer) {
        super()
        this.speechSynthesizer = speechSynthesizer
    }

    public getSpeechSynthesizer(): SpeechSynthesizer {
        return this.speechSynthesizer
    }

    protected getInitialState(): LocationStoreState {
        return {
            turnNavigation: false,
            coordinate: { lat: 0, lng: 0 },
            speed: 0,
        }
    }

    reduce(state: LocationStoreState, action: Action): LocationStoreState {
        if (action instanceof LocationUpdate) {
            console.log('LocationUpdate action {}', action.location)
            return action.location
        }
        return state
    }

    public initFake() {
        this.started = true

        let route = 2
        let latlon: number[][]
        if (route == 1) {
            // http://localhost:3000/?point=51.439291%2C14.245254&point=51.43322%2C14.234999&profile=car
            latlon = [
                [51.439291, 14.245254, 180, 0],
                [51.438989, 14.245405, 180, 3],
                [51.438895, 14.245191, 180, 3],
                [51.438694, 14.245577, 90, 8],
                [51.438668, 14.246092, 90, 8],
                [51.438226, 14.246972, 180, 11],
                [51.436795, 14.245921, 180, 11],
                [51.435029, 14.243259, 270, 11],
                [51.435203, 14.241006, 270, 10],
                [51.434788, 14.238882, 180, 4],
                [51.434146, 14.237745, 270, 2],
                [51.433959, 14.235985, 180, 5],
                [51.43322, 14.2349991, 270, 3],
            ]
        } else {
            // http://localhost:3000/?point=51.438818%2C14.243717&point=51.437858%2C14.244785&point=51.438181%2C14.242442&profile=foot
            latlon = [
                [51.4388, 14.243857, 110, 1],
                [51.438727, 14.244184, 200, 1],
                [51.43836, 14.243954, 200, 1],
                [51.438176, 14.244002, 120, 1],
                [51.438108, 14.244266, 120, 1],
                [51.43801, 14.244584, 120, 1],
                [51.43791, 14.244783, 150, 1],
                [51.437733, 14.244692, 210, 2],
            ]
        }
        let currentIndex: number = 0
        this.locationUpdate({
            coords: {
                latitude: latlon[currentIndex][0],
                longitude: latlon[currentIndex][1],
                heading: latlon[currentIndex][2],
                speed: latlon[currentIndex][3],
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
                    speed: latlon[currentIndex][3],
                },
            })
        }, 3000)
    }

    private locationUpdate(pos: any) {
        // TODO NOW: 'this is undefined' if called from watchPosition: if (!this.started) return

        let c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        Dispatcher.dispatch(new LocationUpdate({ coordinate: c, turnNavigation: true, speed: pos.coords.speed }))
        let bearing: number = pos.coords.heading

        if (Number.isNaN(bearing)) console.log('skip dispatching SetViewportToPoint because bearing is ' + bearing)
        else Dispatcher.dispatch(new SetViewportToPoint(c, 17, 50, bearing))
    }

    public initReal() {
        this.started = true
        if (!this.noSleep) this.noSleep = new NoSleep()
        this.noSleep.enable()
        if (!navigator.geolocation) {
            console.log('location not supported. In firefox I had to set geo.enabled=true in about:config')
        } else {
            console.log('location init ', this.watchId)
            // this.speechSynthesizer.synthesize(tr('welcome'))
            // force calling clearWatch can help to find GPS fix more reliable in android firefox
            if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId)

            let options = {
                timeout: 120_000,
                // maximumAge is not a problem here like with getCurrentPosition but let's use identical settings
                // enableHighAccuracy: false
            }
            this.watchId = navigator.geolocation.watchPosition(
                this.locationUpdate,
                err => {
                    if (this.started) Dispatcher.dispatch(new ErrorAction('location watch error: ' + err.message))
                },
                options
            )
            try {
                let el = document.documentElement
                let requestFullscreenFct = el.requestFullscreen
                requestFullscreenFct.call(el)
            } catch (e) {
                console.log(e)
            }
        }
    }

    public stop() {
        console.log('LocationStore.stop', this.watchId, this.interval)
        if (document.fullscreenElement) document.exitFullscreen()

        this.started = false
        if (this.interval) clearInterval(this.interval)

        if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId)

        // exit "navigation view" => use no pitch and no bearing (rotation)
        Dispatcher.dispatch(new SetViewportToPoint(this.state.coordinate, 15, 0, 0))

        // directly writing the state does not work: this.state.turnNavigation = false
        Dispatcher.dispatch(new LocationUpdate({ coordinate: { lat: 0, lng: 0 }, turnNavigation: false, speed: 0 }))

        if (this.noSleep) this.noSleep.disable()
    }
}
