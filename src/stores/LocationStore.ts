import { Coordinate } from '@/stores/QueryStore'
import Store from '@/stores/Store'
import {ErrorAction, LocationUpdate, NavigationStop, ZoomMapToPoint} from '@/actions/Actions'
import Dispatcher, { Action } from '@/stores/Dispatcher'
import NoSleep from 'nosleep.js'
import { SpeechSynthesizer } from '@/SpeechSynthesizer'
import { ApiImpl } from '@/api/Api'
import { calcOrientation, toNorthBased } from '@/turnNavigation/GeoMethods'
import * as config from 'config'
import {toDegrees, toRadians} from "ol/math";

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
        super({
            turnNavigation: false,
            coordinate: { lat: 0, lng: 0 },
            speed: 0,
        })
        this.speechSynthesizer = speechSynthesizer
    }

    public getSpeechSynthesizer(): SpeechSynthesizer {
        return this.speechSynthesizer
    }

    reduce(state: LocationStoreState, action: Action): LocationStoreState {
        if(action instanceof NavigationStop) {
            this.stop()
            // directly writing the state does not work: this.state.turnNavigation = false
            return { coordinate: { lat: 0, lng: 0 }, turnNavigation: false, speed: 0 }
        } else if (action instanceof LocationUpdate) {
            // console.log('LocationUpdate action {}', action.location)
            return action.location
        }
        return state
    }

    public async initFake() {
        console.log('started fake GPS injection')
        this.started = true

        // http://localhost:3000/?point=51.439291%2C14.245254&point=51.43322%2C14.234999&profile=car&layer=MapTiler&fake=true
        let api = new ApiImpl(config.api, config.keys.graphhopper)
        let response = await api.route({
            points: [
                [14.245254, 51.439291],
                [14.234999, 51.43322],
            ],
            profile: 'car',
            maxAlternativeRoutes: 0,
            zoom: false,
            customModel: null,
        })

        // TODO: skip too close points and interpolate if too big distance
        let coords: number[][] = response.paths[0].points.coordinates
        let latlon: number[][] = new Array(coords.length)

        for (let idx = 0; idx < coords.length; idx++) {
            // very ugly: in JS the random object cannot be initialed with a seed
            const lat = coords[idx][1] // + 0.0001 * Math.random() // approx +-5m ?
            const lon = coords[idx][0] // + 0.0001 * Math.random()
            let heading = 0
            if (idx > 0) {
                const prevLat = coords[idx - 1][1]
                const prevLon = coords[idx - 1][0]
                let o = calcOrientation(prevLat, prevLon, lat, lon)
                heading = toDegrees(toNorthBased(o))
            }
            latlon[idx] = [lat, lon, heading, 4]
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
            // console.log(currentIndex)
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
        let c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        Dispatcher.dispatch(new LocationUpdate({ coordinate: c, turnNavigation: true, speed: pos.coords.speed }))
        let bearing: number = pos.coords.heading

        if (!bearing || Number.isNaN(bearing)) console.log('skip dispatching SetViewportToPoint because bearing is ' + bearing)
        else Dispatcher.dispatch(new ZoomMapToPoint(c, 17, 50, bearing))
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
                timeout: 300_000,
                // maximumAge is not a problem here like with getCurrentPosition but let's use identical settings
                enableHighAccuracy: true,
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
                console.log('error requesting full screen ' + JSON.stringify(e))
            }
        }
    }

    public stop() {
        // console.log('LocationStore.stop', this.watchId, this.interval)
        if (document.fullscreenElement) document.exitFullscreen()

        this.started = false
        if (this.interval) clearInterval(this.interval)

        if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId)

        if (this.noSleep) this.noSleep.disable()
    }
}
