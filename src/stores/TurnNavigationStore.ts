import { Coordinate } from '@/stores/QueryStore'
import Store from '@/stores/Store'
import {
    ErrorAction,
    InfoReceived,
    LocationUpdate,
    LocationUpdateSync,
    SelectMapLayer,
    SetCustomModel,
    SetCustomModelEnabled,
    SetSelectedPath,
    SetVehicleProfile,
    ToggleFullScreenForNavigation,
    ToggleVectorTilesForNavigation,
    TurnNavigationRerouting,
    TurnNavigationReroutingFailed,
    TurnNavigationReroutingTimeResetForTest,
    TurnNavigationSettingsUpdate,
    TurnNavigationStart,
    TurnNavigationStop,
} from '@/actions/Actions'
import Dispatcher, { Action } from '@/stores/Dispatcher'
import NoSleep from '@/turnNavigation/nosleep.js'
import Api, { ApiImpl } from '@/api/Api'
import {
    calcDist,
    calcOrientation,
    getCurrentDetails,
    getCurrentInstruction,
    toDegrees,
    toNorthBased,
} from '@/turnNavigation/GeoMethods'
import { Instruction, Path, RoutingArgs } from '@/api/graphhopper'
import { tr } from '@/translation/Translation'
import { SpeechSynthesizer } from '@/SpeechSynthesizer'
import { Pixel } from 'ol/pixel'

export interface TurnNavigationStoreState {
    // TODO replace "showUI" with a composite state depending on activePath, coordinate and instruction
    showUI: boolean
    started: boolean
    oldTiles: string
    coordinate: Coordinate
    lastRerouteTime: number
    lastRerouteDistanceToRoute: number
    speed: number
    heading?: number
    initialPath: Path | null
    activePath: Path | null
    activeProfile: string
    customModelEnabled: boolean
    customModelStr: string
    rerouteInProgress: boolean
    settings: TNSettingsState
    instruction: TNInstructionState
    pathDetails: TNPathDetailsState
}

export interface TNInstructionState {
    index: number
    announcementsToDo: number
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
    fakeGPSDelta: number
    syncView: boolean
    acceptedRisk: boolean
    soundEnabled: boolean
    forceVectorTiles: boolean
    fullScreen: boolean
}

export interface MapCoordinateSystem {
    getCoordinateFromPixel(pixel: Pixel): number[]
}

export default class TurnNavigationStore extends Store<TurnNavigationStoreState> {
    private readonly api: Api
    private watchId: any = undefined
    private interval: any
    private noSleep: NoSleep | null = null
    private readonly speechSynthesizer: SpeechSynthesizer
    private readonly cs: MapCoordinateSystem

    constructor(
        api: Api,
        speechSynthesizer: SpeechSynthesizer,
        cs: MapCoordinateSystem,
        fakeGPSDelta: number,
        tiles: string,
        customModelStr: string
    ) {
        super({
            showUI: false,
            started: false,
            oldTiles: tiles,
            coordinate: { lat: 0, lng: 0 },
            speed: 0,
            initialPath: null,
            activePath: null,
            customModelEnabled: !!customModelStr,
            customModelStr: customModelStr,
            rerouteInProgress: false,
            lastRerouteTime: 0,
            lastRerouteDistanceToRoute: 0,
            activeProfile: '',
            settings: {
                acceptedRisk: false,
                fakeGPSDelta: fakeGPSDelta,
                syncView: true,
                soundEnabled: Number.isNaN(fakeGPSDelta),
                forceVectorTiles: true,
                fullScreen: true,
            } as TNSettingsState,
            instruction: {} as TNInstructionState,
            pathDetails: {} as TNPathDetailsState,
        })
        this.cs = cs
        this.api = api
        this.speechSynthesizer = speechSynthesizer
    }

    reduce(state: TurnNavigationStoreState, action: Action): TurnNavigationStoreState {
        // For the navigation we need:
        // current location (frequently updated), the active path (updated on reroute) and the profile (required for rerouting)
        // and so we collect this from different actions
        if (action instanceof TurnNavigationStop) {
            this.stop()
            return {
                ...state,
                showUI: false,
                started: false,
                speed: 0,
                heading: 0,
                settings: { ...state.settings, syncView: true },
            }
        } else if (action instanceof TurnNavigationSettingsUpdate) {
            return { ...state, settings: { ...state.settings, ...action.settings } }
        } else if (action instanceof TurnNavigationStart) {
            // Make sound work for Safari 16.1.2. Otherwise, it probably thinks that the LocationUpdates are NOT user-triggered.
            this.speechSynthesizer.synthesize('')

            if (Number.isNaN(state.settings.fakeGPSDelta)) this.initReal()
            else this.initFake()
            return { ...state, started: true }
        } else if (action instanceof ToggleVectorTilesForNavigation) {
            return {
                ...state,
                settings: { ...state.settings, forceVectorTiles: !state.settings.forceVectorTiles },
            }
        } else if (action instanceof ToggleFullScreenForNavigation) {
            return {
                ...state,
                settings: { ...state.settings, fullScreen: !state.settings.fullScreen },
            }
        } else if (action instanceof SelectMapLayer) {
            if (!this.state.started && !action.forNavigation)
                return {
                    ...state,
                    oldTiles: action.layer,
                }
        } else if (action instanceof TurnNavigationReroutingFailed) {
            console.log('TurnNavigationReroutingFailed')
            return {
                ...state,
                rerouteInProgress: false,
            }
        } else if (action instanceof SetCustomModelEnabled) {
            return {
                ...state,
                customModelEnabled: action.enabled,
            }
        } else if (action instanceof SetCustomModel) {
            console.log('SetCustomModel ' + action.customModelStr)
            return {
                ...state,
                customModelStr: action.customModelStr,
            }
        } else if (action instanceof InfoReceived) {
            if (state.activeProfile || action.result.profiles.length <= 0) return state
            return {
                ...state,
                activeProfile: action.result.profiles[0].name,
            }
        } else if (action instanceof SetVehicleProfile) {
            console.log('SetVehicleProfile, profile: ' + action.profile.name)
            return {
                ...state,
                activeProfile: action.profile.name,
            }
        } else if (action instanceof LocationUpdateSync) {
            return { ...state, settings: { ...state.settings, syncView: action.enableViewSync } }
        } else if (action instanceof SetSelectedPath) {
            // no need to update instruction as changing the path should happen only outside of the navigation
            if (state.showUI) throw new Error('Changing path while turn navigation should not happen')

            return {
                ...state,
                initialPath: action.path,
                activePath: action.path,
                instruction: {} as TNInstructionState,
                pathDetails: {} as TNPathDetailsState,
            }
        } else if (action instanceof LocationUpdate) {
            if (state.initialPath == null || state.activePath == null) {
                // this can happen e.g. if the turn navigation was stopped before a location update came in
                console.log('LocationUpdate skipped due to activePath or initialPath being null')
                return state
            }

            let announcementsToDo = state.instruction.announcementsToDo

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
            if (state.showUI && (skipWaypoint || this.shouldReroute(instr.distanceToRoute))) {
                let queriedAPI = false
                if (state.activeProfile && !state.rerouteInProgress) {
                    const nextWaypoints = path.snapped_waypoints.coordinates
                        .slice(instr.nextWaypointIndex)
                        .map(p => [p[0], p[1]] as [number, number])
                    if (nextWaypoints.length == 0)
                        throw Error('rerouting needs a destination but was empty ' + JSON.stringify(path))
                    const customModel = TurnNavigationStore.getCustomModel(state)

                    let args: RoutingArgs = {
                        points: [[coordinate.lng, coordinate.lat] as [number, number]].concat(nextWaypoints),
                        maxAlternativeRoutes: 0,
                        heading: ApiImpl.isMotorVehicle(state.activeProfile) ? action.heading : undefined,
                        profile: state.activeProfile,
                        customModel: customModel,
                    }
                    this.api
                        .route(args)
                        .then(result => {
                            if (result.paths.length > 0) {
                                console.log('rerouted:' + state.activePath?.distance + '->' + result.paths[0].distance)
                                Dispatcher.dispatch(new TurnNavigationRerouting(result.paths[0]))
                                if (!skipWaypoint) this.synthesize(tr('reroute'))
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
                    console.log('reroute skipped (' + state.activeProfile + ') progress = ' + state.rerouteInProgress)
                }

                return {
                    ...state,
                    rerouteInProgress: queriedAPI,
                    heading: action.heading,
                    speed: action.speed,
                    coordinate: coordinate,
                }
            }

            if (instr.index < 0) {
                console.error(
                    'Instruction cannot be determined. Current location too far away? ' + JSON.stringify(coordinate)
                )
                return state
            }

            const [estimatedAvgSpeed, maxSpeed, surface, roadClass] = getCurrentDetails(path, coordinate, [
                path.details.average_speed,
                path.details.max_speed,
                path.details.surface,
                path.details.road_class,
            ])

            const instructionState = state.instruction
            const nextInstruction: Instruction = path.instructions[instr.index]
            const text = nextInstruction.street_name

            // announce proportional earlier if faster
            const factor = estimatedAvgSpeed < 70 ? 2 : roadClass == 'trunk' || roadClass == 'motorway' ? 7 : 3
            // prefer nearly constant average speed because location.speed changes more often while driving
            const lastAnnounceDistance = Math.max(30, 20 + factor * estimatedAvgSpeed)
            const firstAnnounceDistance = 1150 + factor * estimatedAvgSpeed

            if (instr.index != instructionState.index) announcementsToDo = instr.distanceToTurn > 1000 ? 2 : 1

            const details = factor + ', avg-speed:' + estimatedAvgSpeed + ', announcements:' + announcementsToDo
            console.log('first:' + firstAnnounceDistance + ' last:' + lastAnnounceDistance + ', factor:' + details)

            if (instr.distanceToTurn <= lastAnnounceDistance && announcementsToDo > 0) {
                announcementsToDo = 0
                this.synthesize(nextInstruction.text)
            }

            if (instr.distanceToTurn <= firstAnnounceDistance && announcementsToDo == 2) {
                announcementsToDo = 1
                if (instr.distanceToTurn > lastAnnounceDistance * 1.2 + 50) {
                    // do not interfere with last announcement
                    let inString =
                        instr.distanceToTurn > 1200
                            ? tr('in_km', [(instr.distanceToTurn / 1000).toFixed(1)])
                            : instr.distanceToTurn > 900
                            ? tr('in_km_singular')
                            : tr('in_m', ['' + Math.floor(instr.distanceToTurn / 100) * 100])
                    this.synthesize(inString + ' ' + nextInstruction.text)
                }
            }

            return {
                ...state,
                showUI: true,
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
                    announcementsToDo,
                    text,
                },
                pathDetails: { estimatedAvgSpeed: Math.round(estimatedAvgSpeed), maxSpeed, surface, roadClass },
            }
        } else if (action instanceof TurnNavigationRerouting) {
            const path = action.path

            // ensure that path and instruction are synced
            const instr = getCurrentInstruction(path.instructions, state.coordinate)

            // current location is still not close
            if (instr.index < 0) {
                console.log('instruction after rerouting not found')
                return {
                    ...state,
                    rerouteInProgress: false,
                }
            }

            const text = path.instructions[instr.index].street_name
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
                lastRerouteTime: new Date().getTime(),
                lastRerouteDistanceToRoute: instr.distanceToRoute,
                instruction: {
                    index: instr.index,
                    distanceToTurn: instr.distanceToTurn,
                    timeToEnd: instr.timeToEnd,
                    distanceToEnd: instr.distanceToEnd,
                    nextWaypointIndex: instr.nextWaypointIndex,
                    distanceToWaypoint: instr.distanceToWaypoint,
                    sign: path.instructions[instr.index].sign,
                    announcementsToDo: instr.distanceToTurn > 1000 ? 2 : 1,
                    text,
                },
                pathDetails: { estimatedAvgSpeed: Math.round(estimatedAvgSpeed), maxSpeed, surface, roadClass },
            }
        } else if (action instanceof TurnNavigationReroutingTimeResetForTest) {
            return {
                ...state,
                lastRerouteTime: 0,
            }
        }
        return state
    }

    private static getCustomModel(state: TurnNavigationStoreState) {
        try {
            return state.customModelEnabled ? JSON.parse(state.customModelStr) : null
        } catch {
            return null
        }
    }

    private shouldReroute(currentDistanceToRoute: number) {
        if (currentDistanceToRoute < 50) return false // close to current route
        if (new Date().getTime() - this.state.lastRerouteTime < 10_000) return false // avoid frequent rerouting
        return this.state.lastRerouteDistanceToRoute < currentDistanceToRoute // skip rerouting if getting closer to route
    }

    private synthesize(text: string) {
        console.log('speak: ' + text)
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
        const straightDistToWaypoint = calcDist(actionCoord, waypoint)
        if (straightDistToWaypoint < 50) return true
        return prevStateDistanceToWaypoint < 80 && straightDistToWaypoint < 80
    }

    private async initFake() {
        console.log('started fake GPS injection')

        let mouseControlled = false // control GPS movement via mouse or see below: along a predefined route
        if (mouseControlled) {
            const pixel = [] as number[]
            let prevCoord = { lng: 0, lat: 0 } as Coordinate
            let prevTime = Date.now()
            addEventListener('mousemove', event => {
                pixel[0] = event.x
                pixel[1] = event.y
            })

            this.interval = setInterval(() => {
                const time = Date.now() / 1000.0
                let coord = this.cs.getCoordinateFromPixel(pixel)
                if (!coord[0] || !coord[1]) {
                    console.warn('mouse out of screen')
                    return
                }
                const o = calcOrientation(prevCoord.lat, prevCoord.lng, coord[1], coord[0])
                const distanceInM = calcDist(
                    { lat: prevCoord.lat, lng: prevCoord.lng },
                    { lat: coord[1], lng: coord[0] }
                )
                this.locationUpdate({
                    coords: {
                        latitude: coord[1],
                        longitude: coord[0],
                        heading: toDegrees(toNorthBased(o)),
                        speed: time - prevTime < 1 ? 0 : distanceInM / (time - prevTime),
                    },
                })

                prevCoord.lng = coord[0]
                prevCoord.lat = coord[1]
                prevTime = time
            }, 1000)
            return
        }

        const path = this.state.initialPath ? this.state.initialPath : await this.createFixedPathFromAPICall()

        // TODO: skip too close points
        let origCoords: number[][] = path.points.coordinates
        if (origCoords.length == 0) return
        let coords: number[][] = []

        // interpolate if too big distance
        for (let idx = 0; idx < origCoords.length - 1; idx++) {
            const currC = origCoords[idx]
            const nextC = origCoords[idx + 1]
            const dist = calcDist({ lng: currC[0], lat: currC[1] }, { lng: nextC[0], lat: nextC[1] })
            const count = Math.round(dist / this.state.settings.fakeGPSDelta)
            coords.push(currC)
            for (let i = 1; i < count; i++) {
                const lng = currC[0] + (i / count) * (nextC[0] - currC[0])
                const lat = currC[1] + (i / count) * (nextC[1] - currC[1])
                coords.push([lng, lat])
            }
            if (idx == origCoords.length - 1) coords.push(nextC)
        }

        let latLngHeadSpeed: number[][] = new Array(coords.length)
        const delta = 0
        for (let idx = 0; idx < coords.length; idx++) {
            // very ugly: in JS the random object cannot be initialed with a seed
            const lat = coords[idx][1] + delta * Math.random() // add randomness
            const lon = coords[idx][0] + delta * Math.random()

            let heading = 0
            if (idx > 0) {
                const prevLat = coords[idx - 1][1]
                const prevLon = coords[idx - 1][0]
                let o = calcOrientation(prevLat, prevLon, lat, lon)
                heading = toDegrees(toNorthBased(o))
            }
            latLngHeadSpeed[idx] = [lat, lon, heading, 4]
        }

        let currentIndex: number = 0
        this.interval = setInterval(() => {
            currentIndex %= latLngHeadSpeed.length
            this.locationUpdate({
                coords: {
                    latitude: latLngHeadSpeed[currentIndex][0],
                    longitude: latLngHeadSpeed[currentIndex][1],
                    heading: latLngHeadSpeed[currentIndex][2],
                    speed: latLngHeadSpeed[currentIndex][3],
                },
            })
            currentIndex++
        }, 1000)

        this.doNoSleep()
    }

    private async createFixedPathFromAPICall() {
        // http://localhost:3000/?point=51.439291%2C14.245254&point=51.43322%2C14.234999&profile=car&layer=MapTiler&fake=true
        let response = await this.api.route({
            points: [
                [14.245254, 51.439291],
                [14.234999, 51.43322],
            ],
            heading: 0,
            profile: 'car',
            maxAlternativeRoutes: 0,
            customModel: null,
        })

        return response.paths[0]
    }

    private doNoSleep() {
        if (!this.noSleep) this.noSleep = new NoSleep()
        this.noSleep.enable().catch(err => {
            console.warn("NoSleep.js couldn't be initialized: " + JSON.stringify(err))
        })
    }

    private locationUpdate(pos: any) {
        let c = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        Dispatcher.dispatch(
            new LocationUpdate(c, this.state.settings.syncView, pos.coords.speed, pos.coords.heading, 17)
        )
    }

    private initReal() {
        if (!navigator.geolocation) {
            console.log('location not supported. In firefox I had to set geo.enabled=true in about:config')
        } else {
            console.log('location init ', this.watchId)
            // force calling clearWatch can help to find GPS fix more reliable in android firefox
            if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId)

            if (this.state.settings.fullScreen)
                try {
                    let el = document.documentElement
                    let requestFullscreenFct = el.requestFullscreen
                    requestFullscreenFct.call(el)
                } catch (e) {
                    console.log('error requesting full screen ' + JSON.stringify(e))
                }

            this.watchId = navigator.geolocation.watchPosition(
                this.locationUpdate.bind(this),
                err => {
                    // TODO exit fullscreen does not work
                    //  Dispatcher.dispatch(new TurnNavigationStop())
                    if (this.state.started) Dispatcher.dispatch(new ErrorAction('location watch error: ' + err.message))
                },
                {
                    timeout: 300_000,
                    // maximumAge is not a problem here like with getCurrentPosition but let's use identical settings
                    enableHighAccuracy: true,
                }
            )

            // initialize and enable after potential fullscreen change
            this.doNoSleep()
        }
    }

    public stop() {
        // console.log('LocationStore.stop', this.watchId, this.interval)
        if (document.fullscreenElement) document.exitFullscreen()

        if (this.interval) clearInterval(this.interval)

        if (this.watchId !== undefined) navigator.geolocation.clearWatch(this.watchId)

        if (this.noSleep) this.noSleep.disable()
    }
}
