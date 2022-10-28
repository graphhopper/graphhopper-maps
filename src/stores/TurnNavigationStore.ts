import { Coordinate, QueryStoreState } from '@/stores/QueryStore'
import Store from '@/stores/Store'
import {
    ErrorAction,
    LocationUpdate,
    SetRoutingParametersAtOnce,
    SetSelectedPath,
    SetVehicleProfile,
    TurnNavigationRerouting,
    TurnNavigationReroutingFailed,
    TurnNavigationSettingsUpdate,
    TurnNavigationStop,
    ZoomMapToPoint,
} from '@/actions/Actions'
import Dispatcher, { Action } from '@/stores/Dispatcher'
import NoSleep from 'nosleep.js'
import { SpeechSynthesizer } from '@/SpeechSynthesizer'
import Api, { ApiImpl } from '@/api/Api'
import { calcOrientation, getCurrentDetails, getCurrentInstruction, toNorthBased } from '@/turnNavigation/GeoMethods'
import * as config from 'config'
import { toDegrees } from 'ol/math'
import { Instruction, Path, RoutingArgs, RoutingProfile } from '@/api/graphhopper'
import { getTurnNavigationStore } from '@/stores/Stores'
import { tr } from '@/translation/Translation'

export interface TurnNavigationStoreState {
    enabled: boolean
    coordinate: Coordinate
    speed: number
    heading: number
    activePath: Path
    activeProfile: string
    rerouteInProgress: boolean
    settings: TNSettingsState
    instruction: TNInstructionState
    pathDetails: TNPathDetailsState
}

export interface TNInstructionState {
    index: number
    distanceToNext: number
    remainingTime: number
    remainingDistance: number
    text: string
}

export interface TNPathDetailsState {
    maxSpeed: number
    estimatedAvgSpeed: number
    surface: string
    roadClass: string
}

export interface TNSettingsState {
    fakeGPS: boolean
    acceptedRisk: boolean
    soundEnabled: boolean
}

export default class TurnNavigationStore extends Store<TurnNavigationStoreState> {
    private readonly api: Api
    private watchId: any = undefined
    private interval: any
    private noSleep: any
    private readonly speechSynthesizer: SpeechSynthesizer
    private started: boolean = false

    constructor(api: Api, speechSynthesizer: SpeechSynthesizer, fakeGPS: boolean) {
        super({
            enabled: false,
            coordinate: { lat: 0, lng: 0 },
            speed: 0,
            heading: 0,
            activePath: {} as Path,
            rerouteInProgress: false,
            activeProfile: '',
            settings: { acceptedRisk: false, fakeGPS: fakeGPS, soundEnabled: !fakeGPS } as TNSettingsState,
            instruction: {} as TNInstructionState,
            pathDetails: {} as TNPathDetailsState,
        })
        this.api = api
        this.speechSynthesizer = speechSynthesizer
    }

    public getSpeechSynthesizer(): SpeechSynthesizer {
        return this.speechSynthesizer
    }

    reduce(state: TurnNavigationStoreState, action: Action): TurnNavigationStoreState {
        // For the navigation we need:
        // current location (frequently updated), the active path (updated on reroute) and the profile (required for rerouting)
        if (action instanceof TurnNavigationStop) {
            this.stop()
            return { ...state, enabled: false, speed: 0, heading: 0 }
        } else if (action instanceof TurnNavigationSettingsUpdate) {
            return { ...state, settings: { ...state.settings, ...action.settings } }
        } else if (action instanceof TurnNavigationReroutingFailed) {
            console.log('TurnNavigationReroutingFailed')
            return {
                ...state,
                rerouteInProgress: false,
            }
        } else if (action instanceof TurnNavigationRerouting) {
            const path = action.path

            // ensure that path and instruction are synced
            const { instructionIndex, timeToNext, distanceToNext, distanceToRoute, remainingTime, remainingDistance } =
                getCurrentInstruction(path.instructions, state.coordinate)

            // current location is still not close
            if (instructionIndex < 0) {
                console.log('instruction after rerouting not found')
                return {
                    ...state,
                    rerouteInProgress: false,
                }
            }

            const text = path.instructions[instructionIndex].street_name
            const [estimatedAvgSpeed, maxSpeed, surface, roadClass] = getCurrentDetails(path, state.coordinate, [
                path.details.average_speed,
                path.details.max_speed,
                path.details.surface,
                path.details.road_class,
            ])

            return {
                ...state,
                activePath: path,
                rerouteInProgress: false,
                instruction: { index: instructionIndex, distanceToNext, remainingTime, remainingDistance, text },
                pathDetails: { estimatedAvgSpeed: Math.round(estimatedAvgSpeed), maxSpeed, surface, roadClass },
            }
        } else if (action instanceof SetRoutingParametersAtOnce) {
            console.log('SetRoutingParametersAtOnce, profile: ' + action.routingProfile.name)
            return {
                ...state,
                activeProfile: action.routingProfile.name,
            }
        } else if (action instanceof SetVehicleProfile) {
            console.log('SetVehicleProfile, profile: ' + action.profile.name)
            return {
                ...state,
                activeProfile: action.profile.name,
            }
        } else if (action instanceof SetSelectedPath) {
            // no need to update instruction as changing the path should happen only outside of the navigation
            if (state.enabled) throw new Error('Changing path while turn navigation should not happen')

            return {
                ...state,
                activePath: action.path,
            }
        } else if (action instanceof LocationUpdate) {
            const coordinate = action.coordinate
            const path = state.activePath
            const { instructionIndex, timeToNext, distanceToNext, distanceToRoute, remainingTime, remainingDistance } =
                getCurrentInstruction(path.instructions, coordinate)

            // reroute only if already in turn navigation mode otherwise UI is not ready
            if (state.enabled && distanceToRoute > 50) {
                // TODO use correct customModel

                if (state.activeProfile && !state.rerouteInProgress) {
                    const fromPoint: [number, number] = [coordinate.lng, coordinate.lat]
                    const toPoint: [number, number] = [
                        path.snapped_waypoints.coordinates[1][0],
                        path.snapped_waypoints.coordinates[1][1],
                    ]
                    const args: RoutingArgs = {
                        points: [fromPoint, toPoint],
                        maxAlternativeRoutes: 0,
                        heading: action.heading,
                        zoom: false,
                        profile: state.activeProfile,
                        customModel: null,
                    }
                    this.api
                        .route(args)
                        .then(result => {
                            if (result.paths.length > 0) {
                                console.log('rerouting: {}', result.paths[0])
                                Dispatcher.dispatch(new TurnNavigationRerouting(result.paths[0]))
                                getTurnNavigationStore().getSpeechSynthesizer().synthesize(tr('reroute'))
                            } else {
                                console.log('rerouting found no path: {}', result)
                                Dispatcher.dispatch(new TurnNavigationReroutingFailed())
                            }
                        })
                        .catch(error => {
                            console.warn('error for reroute request: ', error)
                            Dispatcher.dispatch(new TurnNavigationReroutingFailed())
                        })
                } else {
                    console.error(
                        'profile=' + state.activeProfile + ', reroute in progress = ' + state.rerouteInProgress
                    )
                }

                return {
                    ...state,
                    rerouteInProgress: true,
                    heading: action.heading,
                    speed: action.speed,
                    coordinate: coordinate,
                }
            }

            if (instructionIndex < 0) throw new Error('Instruction should be valid if distanceToRoute is small')

            const instructionState = state.instruction
            const nextInstruction: Instruction = path.instructions[instructionIndex]

            const text = nextInstruction.street_name
            if (state.settings.soundEnabled) {
                // making lastAnnounceDistance dependent on location.speed is tricky because then it can change while driving, so pick the constant average speed
                // TODO use instruction average speed of current+next instruction instead of whole path
                let averageSpeed = (path.distance / (path.time / 1000)) * 3.6
                let lastAnnounceDistance = 10 + 2 * Math.round(averageSpeed / 5) * 5

                if (
                    distanceToNext <= lastAnnounceDistance &&
                    (instructionState.distanceToNext > lastAnnounceDistance ||
                        instructionIndex != instructionState.index)
                ) {
                    getTurnNavigationStore().getSpeechSynthesizer().synthesize(nextInstruction.text)
                }

                const firstAnnounceDistance = 1150
                if (
                    averageSpeed > 15 && // two announcements only if faster speed
                    distanceToNext > lastAnnounceDistance + 50 && // do not interfere with last announcement. also "1 km" should stay valid (approximately)
                    distanceToNext <= firstAnnounceDistance &&
                    (instructionState.distanceToNext > firstAnnounceDistance ||
                        instructionIndex != instructionState.index)
                ) {
                    let inString =
                        distanceToNext > 800
                            ? tr('in_km_singular')
                            : tr('in_m', ['' + Math.round(distanceToNext / 100) * 100])
                    getTurnNavigationStore()
                        .getSpeechSynthesizer()
                        .synthesize(inString + ' ' + nextInstruction.text)
                }
            }

            const [estimatedAvgSpeed, maxSpeed, surface, roadClass] = getCurrentDetails(path, coordinate, [
                path.details.average_speed,
                path.details.max_speed,
                path.details.surface,
                path.details.road_class,
            ])

            return {
                ...state,
                enabled: true,
                heading: action.heading,
                speed: action.speed,
                coordinate: coordinate,
                instruction: { index: instructionIndex, distanceToNext, remainingTime, remainingDistance, text },
                pathDetails: { estimatedAvgSpeed: Math.round(estimatedAvgSpeed), maxSpeed, surface, roadClass },
            }
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
            heading: 0,
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
            const lat = coords[idx][1] + 0.001 * Math.random() // approx +-5m ?
            const lon = coords[idx][0] + 0.0001 * Math.random()
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
        Dispatcher.dispatch(new ZoomMapToPoint(c, 17, 50, true, pos.coords.heading))
        Dispatcher.dispatch(new LocationUpdate(c, pos.coords.speed, pos.coords.heading ? pos.coords.heading : 0))
    }

    public initReal() {
        this.started = true
        if (!this.noSleep) this.noSleep = new NoSleep()
        this.noSleep.enable()
        if (!navigator.geolocation) {
            console.log('location not supported. In firefox I had to set geo.enabled=true in about:config')
        } else {
            console.log('location init ', this.watchId)
            // force calling clearWatch can help to find GPS fix more reliable in android firefox
            if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId)

            try {
                let el = document.documentElement
                let requestFullscreenFct = el.requestFullscreen
                requestFullscreenFct.call(el)
            } catch (e) {
                console.log('error requesting full screen ' + JSON.stringify(e))
            }

            this.watchId = navigator.geolocation.watchPosition(
                this.locationUpdate,
                err => {
                    // TODO exit fullscreen does not work
                    //  Dispatcher.dispatch(new TurnNavigationStop())
                    if (this.started) Dispatcher.dispatch(new ErrorAction('location watch error: ' + err.message))
                },
                {
                    timeout: 300_000,
                    // maximumAge is not a problem here like with getCurrentPosition but let's use identical settings
                    enableHighAccuracy: true,
                }
            )
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
