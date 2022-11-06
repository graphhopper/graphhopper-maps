import { Coordinate } from '@/stores/QueryStore'
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
import Api, { ApiImpl } from '@/api/Api'
import {
    calcOrientation,
    distCalc,
    getCurrentDetails,
    getCurrentInstruction,
    toDegrees,
    toNorthBased,
} from '@/turnNavigation/GeoMethods'
import * as config from 'config'
import { Instruction, Path, RoutingArgs } from '@/api/graphhopper'
import { tr } from '@/translation/Translation'
import { SpeechSynthesizer } from '@/SpeechSynthesizer'

export interface TurnNavigationStoreState {
    // TODO replace "enabled" with a composite state depending on activePath, coordinate and instruction
    enabled: boolean
    coordinate: Coordinate
    speed: number
    heading: number
    initialPath: Path | null
    activePath: Path | null
    activeProfile: string
    rerouteInProgress: boolean
    settings: TNSettingsState
    instruction: TNInstructionState
    pathDetails: TNPathDetailsState
}

export interface TNInstructionState {
    index: number
    distanceToTurn: number
    timeToEnd: number
    distanceToEnd: number
    nextWaypointIndex: number
    distanceToWaypoint: number
    sign: number
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
            initialPath: null,
            activePath: null,
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
        // and so we collect this from different actions
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
                initialPath: action.path,
                activePath: action.path,
                instruction: {} as TNInstructionState,
                pathDetails: {} as TNPathDetailsState,
            }
        } else if (action instanceof LocationUpdate) {
            if (state.initialPath == null) throw new Error('initialPath must not be null')
            if (state.activePath == null) throw new Error('activePath must not be null')
            const coordinate = action.coordinate
            let path = state.activePath
            let instr = getCurrentInstruction(path.instructions, coordinate)

            // skip waypoint if close to it and next is available (either activePath has via points or initialPath)
            let skipWaypoint = TurnNavigationStore.skipWaypoint(
                state.instruction.distanceToWaypoint,
                TurnNavigationStore.getWaypoint(path, instr.nextWaypointIndex),
                state.coordinate,
                action.coordinate
            )
            // ... the waypoint of activePath should be skipped -> pick next waypoint from initialPath
            if (
                skipWaypoint &&
                path.snapped_waypoints.coordinates.length == 2 &&
                state.initialPath.snapped_waypoints.coordinates.length > 2
            ) {
                // switch back to original path and skip the current waypoint
                path = state.initialPath
                instr = getCurrentInstruction(path.instructions, coordinate)
                skipWaypoint = TurnNavigationStore.skipWaypoint(
                    state.instruction.distanceToWaypoint,
                    TurnNavigationStore.getWaypoint(path, instr.nextWaypointIndex),
                    state.coordinate,
                    action.coordinate
                )
            }

            // the initialPath can contain more than 2 waypoints -> pick the next as destination for rerouting
            if (skipWaypoint) {
                if (instr.nextWaypointIndex + 1 < path.snapped_waypoints.coordinates.length) instr.nextWaypointIndex++
                else skipWaypoint = false // no reroute if end is reached
            }

            // reroute only if already in turn navigation mode otherwise UI is not ready
            if (state.enabled && (instr.distanceToRoute > 50 || skipWaypoint)) {
                let queriedAPI = false
                if (state.activeProfile && !state.rerouteInProgress) {
                    const toCoordinate = TurnNavigationStore.getWaypoint(path, instr.nextWaypointIndex)
                    const args: RoutingArgs = {
                        points: [
                            [coordinate.lng, coordinate.lat],
                            [toCoordinate.lng, toCoordinate.lat],
                        ],
                        maxAlternativeRoutes: 0,
                        heading: action.heading,
                        zoom: false,
                        profile: state.activeProfile,
                        // TODO use correct customModel
                        customModel: null,
                    }
                    this.api
                        .route(args)
                        .then(result => {
                            if (result.paths.length > 0) {
                                console.log('rerouted:' + state.activePath?.distance + '->' + result.paths[0].distance)
                                Dispatcher.dispatch(new TurnNavigationRerouting(result.paths[0]))
                                this.synthesize(tr('reroute'))
                            } else {
                                console.log('rerouting found no path: {}', result)
                                Dispatcher.dispatch(new TurnNavigationReroutingFailed())
                            }
                        })
                        .catch(error => {
                            console.warn('error for reroute request: ', error)
                            Dispatcher.dispatch(new TurnNavigationReroutingFailed())
                        })
                    queriedAPI = true
                } else {
                    console.log('profile=' + state.activeProfile + ', reroute in progress = ' + state.rerouteInProgress)
                }

                return {
                    ...state,
                    rerouteInProgress: queriedAPI,
                    heading: action.heading,
                    speed: action.speed,
                    coordinate: coordinate,
                }
            }

            if (instr.index < 0) throw new Error('Instruction should be valid if distanceToRoute is small')

            const instructionState = state.instruction
            const nextInstruction: Instruction = path.instructions[instr.index]

            const text = nextInstruction.street_name
            if (state.settings.soundEnabled) {
                // making lastAnnounceDistance dependent on location.speed is tricky because then it can change while driving, so pick the constant average speed
                // TODO use instruction average speed of current+next instruction instead of whole path
                let averageSpeed = (path.distance / (path.time / 1000)) * 3.6
                let lastAnnounceDistance = 10 + 2 * Math.round(averageSpeed / 5) * 5

                if (
                    instr.distanceToTurn <= lastAnnounceDistance &&
                    (instructionState.distanceToTurn > lastAnnounceDistance || instr.index != instructionState.index)
                ) {
                    this.synthesize(nextInstruction.text)
                }

                const firstAnnounceDistance = 1150
                if (
                    averageSpeed > 15 && // two announcements only if faster speed
                    instr.distanceToTurn > lastAnnounceDistance + 50 && // do not interfere with last announcement. also "1 km" should stay valid (approximately)
                    instr.distanceToTurn <= firstAnnounceDistance &&
                    (instructionState.distanceToTurn > firstAnnounceDistance || instr.index != instructionState.index)
                ) {
                    let inString =
                        instr.distanceToTurn > 800
                            ? tr('in_km_singular')
                            : tr('in_m', ['' + Math.round(instr.distanceToTurn / 100) * 100])
                    this.synthesize(inString + ' ' + nextInstruction.text)
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
                instruction: {
                    index: instr.index,
                    distanceToTurn: instr.distanceToTurn,
                    timeToEnd: instr.timeToEnd,
                    distanceToEnd: instr.distanceToEnd,
                    nextWaypointIndex: instr.nextWaypointIndex,
                    distanceToWaypoint: instr.distanceToWaypoint,
                    sign: path.instructions[instr.index].sign,
                    text,
                },
                pathDetails: { estimatedAvgSpeed: Math.round(estimatedAvgSpeed), maxSpeed, surface, roadClass },
            }
        } else if (action instanceof TurnNavigationRerouting) {
            const path = action.path

            // ensure that path and instruction are synced
            const { index, distanceToTurn, timeToEnd, distanceToEnd, nextWaypointIndex, distanceToWaypoint } =
                getCurrentInstruction(path.instructions, state.coordinate)

            // current location is still not close
            if (index < 0) {
                console.log('instruction after rerouting not found')
                return {
                    ...state,
                    rerouteInProgress: false,
                }
            }

            const text = path.instructions[index].street_name
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
                instruction: {
                    index,
                    distanceToTurn: distanceToTurn,
                    timeToEnd: timeToEnd,
                    distanceToEnd: distanceToEnd,
                    nextWaypointIndex: nextWaypointIndex,
                    distanceToWaypoint: distanceToWaypoint,
                    sign: path.instructions[index].sign,
                    text,
                },
                pathDetails: { estimatedAvgSpeed: Math.round(estimatedAvgSpeed), maxSpeed, surface, roadClass },
            }
        }
        return state
    }

    private synthesize(text: string) {
        if (this.state.settings.soundEnabled) this.speechSynthesizer.synthesize(text)
    }

    private static getWaypoint(path: Path, nextWaypointIndex: number): Coordinate {
        return {
            lng: path.snapped_waypoints.coordinates[nextWaypointIndex][0],
            lat: path.snapped_waypoints.coordinates[nextWaypointIndex][1],
        }
    }

    public static skipWaypoint(
        prevStateDistanceToWaypoint: number,
        waypoint: Coordinate,
        stateCoord: Coordinate,
        actionCoord: Coordinate
    ): boolean {
        // if waypoint reached use next waypoint as destination
        if (prevStateDistanceToWaypoint < 50) return true
        const straightDistToWaypoint = distCalc(actionCoord.lat, actionCoord.lng, waypoint.lat, waypoint.lng)
        if (straightDistToWaypoint < 50) return true
        return prevStateDistanceToWaypoint < 80 && straightDistToWaypoint < 80
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
            const lat = coords[idx][1] + 0.0007 * Math.random() // approx +-5m ?
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
