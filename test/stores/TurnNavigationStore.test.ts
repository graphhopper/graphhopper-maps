import Dispatcher from '@/stores/Dispatcher'
import { LocationUpdate, SetSelectedPath, SetVehicleProfile } from '@/actions/Actions'
import TurnNavigationStore from '@/stores/TurnNavigationStore'
import { SpeechSynthesizer } from '@/SpeechSynthesizer'
import { ApiInfo, GeocodingResult, RawResult, RoutingArgs, RoutingResult } from '@/api/graphhopper'
import Api, { ApiImpl } from '@/api/Api'
import { setTranslation } from '@/translation/Translation'
import { Coordinate } from '@/stores/QueryStore'

let routeWithVia = toRoutingResult(require('../turnNavigation/response-hoyerswerda2.json'))
let reroute1 = toRoutingResult(require('../turnNavigation/reroute1.json'))
let routeWithSimpleVia = toRoutingResult(require('../turnNavigation/routeWithSimpleVia.json'))
let reroute2 = toRoutingResult(require('../turnNavigation/reroute2.json'))

function toRoutingResult(rawResult: RawResult): RoutingResult {
    return {
        ...rawResult,
        paths: ApiImpl.decodeResult(rawResult, true),
    }
}

describe('TurnNavigationStore', () => {
    beforeAll(() => {
        setTranslation('en')
    })

    afterEach(() => {
        Dispatcher.clear()
    })

    describe('geo method', () => {
        it('skip waypoint', () => {
            // close enough
            expect(
                TurnNavigationStore.skipWaypoint(49, {} as Coordinate, {} as Coordinate, {} as Coordinate)
            ).toBeTruthy()

            // state and action coordinate are both not close enough but indicate passing waypoint
            expect(
                TurnNavigationStore.skipWaypoint(
                    58,
                    { lng: 14.081976, lat: 51.420467 },
                    { lng: 14.082183, lat: 51.420978 },
                    { lng: 14.081711, lat: 51.419924 }
                )
            ).toBeTruthy()

            // https://graphhopper.com/maps/?point=51.421294%2C14.08236&point=51.420467%2C14.081976&point=51.420814%2C14.083116
            // not close enough and no passing
            expect(
                TurnNavigationStore.skipWaypoint(
                    110,
                    { lng: 14.081976, lat: 51.420467 },
                    { lng: 14.08236, lat: 51.421294 },
                    { lng: 14.083116, lat: 51.420814 }
                )
            ).toBeFalsy()

            // https://graphhopper.com/maps/?point=51.420978%2C14.082183&point=51.420467%2C14.081976&point=51.419894%2C14.082424
            // not close enough but roughly passing
            expect(
                TurnNavigationStore.skipWaypoint(
                    58,
                    { lng: 14.081976, lat: 51.420467 },
                    { lng: 14.082183, lat: 51.420978 },
                    { lng: 14.082424, lat: 51.419894 }
                )
            ).toBeTruthy()

            // https://graphhopper.com/maps/?point=51.418877%2C14.07319&point=51.419021%2C14.073986&point=51.418791%2C14.074043
            // not close enough but typical situation of passing by
            expect(
                TurnNavigationStore.skipWaypoint(
                    72,
                    { lng: 14.073986, lat: 51.419021 },
                    { lng: 14.07319, lat: 51.418877 },
                    { lng: 14.074043, lat: 51.418791 }
                )
            ).toBeTruthy()

            // https://graphhopper.com/maps/?point=51.418877%2C14.07319&point=51.419593%2C14.074243&point=51.418791%2C14.074043
            // same situation but too far away from waypoint
            expect(
                TurnNavigationStore.skipWaypoint(
                    72,
                    { lng: 14.074243, lat: 51.419593 },
                    { lng: 14.07319, lat: 51.418877 },
                    { lng: 14.074043, lat: 51.418791 }
                )
            ).toBeFalsy()
        })
    })

    describe('path state handling', () => {
        it('should set path', () => {
            const store = createStore(new LocalApi())
            Dispatcher.dispatch(new SetSelectedPath(reroute1.paths[0]))
            expect(store.state.initialPath).toEqual(reroute1.paths[0])
        })

        it('should reroute', async () => {
            // TODO are these ugly numbers like 00000000001 from server-side snapped_waypoints array?
            const rerouteWaypoints = [
                [14.267587, 51.434226],
                [14.267240000000001, 51.43253000000001],
            ] as [number, number][]
            const store = createStore(new LocalApi().setRerouteData(reroute1, rerouteWaypoints))
            // no navigation without profile although path is already selected (this ensures that rerouting is based on proper previous states)
            Dispatcher.dispatch(new SetSelectedPath(reroute1.paths[0]))
            Dispatcher.dispatch(new LocationUpdate({ lat: 51.434681, lng: 14.267249 }, 12, 120))
            expect(Math.round(store.state.instruction.distanceToRoute)).toBeNaN()
            expect(store.state.showUI).toBeFalsy()

            Dispatcher.dispatch(new SetVehicleProfile({ name: 'car' }))
            Dispatcher.dispatch(new LocationUpdate({ lat: 51.434681, lng: 14.267249 }, 10, 120))
            expect(store.state.speed).toEqual(10)
            expect(store.state.showUI).toBeTruthy()
            expect(Math.round(store.state.instruction.distanceToRoute)).toEqual(59) // usually this would trigger a rerouting but showUI was false before
            expect(store.state.activePath).toEqual(reroute1.paths[0])
            expect(store.state.instruction.index).toEqual(1)
            expect(store.state.rerouteInProgress).toBeFalsy()

            Dispatcher.dispatch(new LocationUpdate({ lat: 51.434226, lng: 14.267587 }, 12, 120))
            expect(store.state.speed).toEqual(12)
            expect(store.state.rerouteInProgress).toBeTruthy()
            await flushPromises()
            expect(store.state.rerouteInProgress).toBeFalsy()
            expect(Math.round(store.state.instruction.distanceToRoute)).toEqual(5)

            expect(store.state.activePath).toEqual(reroute1.paths[0])
            expect(store.state.instruction.index).toEqual(1)

            // now try again point which is more than 50m away but change of distanceToRoute is smaller than 50m
            Dispatcher.dispatch(new LocationUpdate({ lat: 51.434621, lng: 14.267303 }, 10, 120))
            expect(store.state.speed).toEqual(10)
            expect(Math.round(store.state.instruction.distanceToRoute)).toEqual(51)
            expect(store.state.rerouteInProgress).toBeFalsy()
        })

        it('should reroute with via point', async () => {
            const rerouteWaypoints = [
                [14.269289, 51.434764],
                [14.26725, 51.43253000000001],
            ] as [number, number][]
            const store = createStore(new LocalApi().setRerouteData(reroute1, rerouteWaypoints))
            Dispatcher.dispatch(new SetSelectedPath(routeWithVia.paths[0]))
            Dispatcher.dispatch(new SetVehicleProfile({ name: 'car' }))
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.266959, lat: 51.435051 }, 10, 120))
            expect(store.state.speed).toEqual(10)
            expect(store.state.instruction.index).toEqual(1)
            expect(store.state.activePath).toEqual(routeWithVia.paths[0])

            // close to via point it should force rerouting to avoid potential interferences with overlapping edges
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.269289, lat: 51.434764 }, 12, 70))
            expect(store.state.speed).toEqual(12)

            expect(store.state.rerouteInProgress).toBeTruthy()
            await flushPromises()
            expect(store.state.rerouteInProgress).toBeFalsy()

            expect(store.state.activePath?.distance).toEqual(reroute1.paths[0].distance)
            expect(store.state.instruction.index).toEqual(1)
        })

        it('should reroute with via point passing by', async () => {
            const rerouteWaypoints = [
                [14.271099, 51.435433],
                [14.267240000000001, 51.43253000000001],
            ] as [number, number][]
            const store = createStore(new LocalApi().setRerouteData(reroute1, rerouteWaypoints))
            Dispatcher.dispatch(new SetSelectedPath(routeWithSimpleVia.paths[0]))
            Dispatcher.dispatch(new SetVehicleProfile({ name: 'car' }))
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.2727, lat: 51.436269 }, 10, 120))
            expect(store.state.activePath).toEqual(routeWithSimpleVia.paths[0])

            // close to middle waypoint but not within 50m
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.27109, lat: 51.435472 }, 12, 70))
            expect(store.state.speed).toEqual(12)

            // close to middle waypoint but again not within 50m but still rerouting as skipWaypoint was true
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.271099, lat: 51.435433 }, 14, 70))
            expect(store.state.speed).toEqual(14)

            expect(store.state.rerouteInProgress).toBeTruthy()
            await flushPromises()
            expect(store.state.rerouteInProgress).toBeFalsy()

            expect(store.state.activePath?.distance).toEqual(reroute1.paths[0].distance)
            expect(store.state.instruction.index).toEqual(1)
        })

        it('reroute and fetch next destination from initialPath', async () => {
            const rerouteWaypoints = [
                [14.273946, 51.436422],
                [14.27026, 51.435140000000004],
            ] as [number, number][]
            const api = new LocalApi()
            api.setRerouteData(reroute2, rerouteWaypoints)
            const store = createStore(api)
            Dispatcher.dispatch(new SetSelectedPath(routeWithSimpleVia.paths[0]))
            Dispatcher.dispatch(new SetVehicleProfile({ name: 'car' }))
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.2727, lat: 51.436269 }, 10, 120))
            expect(store.state.activePath).toEqual(routeWithSimpleVia.paths[0])

            // force reroute
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.273946, lat: 51.436422 }, 12, 70))
            expect(store.state.speed).toEqual(12)
            expect(store.state.rerouteInProgress).toBeTruthy()
            await flushPromises()
            expect(store.state.rerouteInProgress).toBeFalsy()
            expect(store.state.activePath?.distance).toEqual(reroute2.paths[0].distance)

            // reroute from initialPath
            const newWaypoints = [
                [14.270589, 51.435272],
                [14.267240000000001, 51.43253000000001],
            ] as [number, number][]
            api.setRerouteData(reroute1, newWaypoints)
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.270589, lat: 51.435272 }, 16, 70))
            expect(store.state.speed).toEqual(16)

            expect(store.state.rerouteInProgress).toBeTruthy()
            await flushPromises()
            expect(store.state.rerouteInProgress).toBeFalsy()
            expect(store.state.activePath?.distance).toEqual(reroute1.paths[0].distance)
            expect(store.state.instruction.index).toEqual(1)
        })
    })

    function createStore(api: Api) {
        const store = new TurnNavigationStore(api, new DummySpeech(), true, '')
        Dispatcher.register(store)
        return store
    }

    class DummySpeech implements SpeechSynthesizer {
        synthesize(text: string, offline = true) {
            // TODO we could collect the text to ensure spoken words
        }
    }

    class LocalApi implements Api {
        private resultOnReroute?: RoutingResult
        private waypointsInQuery?: [number, number][]

        setRerouteData(resultOnReroute: RoutingResult, waypointsInQuery: [number, number][]): Api {
            this.resultOnReroute = resultOnReroute
            this.waypointsInQuery = waypointsInQuery
            return this
        }

        route(args: RoutingArgs): Promise<RoutingResult> {
            if (this.waypointsInQuery) expect(args.points).toEqual(this.waypointsInQuery)
            if (!this.resultOnReroute) throw Error('no result on reroute defined')
            return Promise.resolve(this.resultOnReroute)
        }

        geocode(query: string): Promise<GeocodingResult> {
            return Promise.resolve({
                took: 0,
                hits: [],
            })
        }

        supportsGeocoding(): boolean {
            return false
        }

        info(): Promise<ApiInfo> {
            return Promise.resolve({
                bbox: [0, 0, 0, 0],
                elevation: false,
                version: '',
                import_date: '',
                profiles: [],
                encoded_values: [],
            })
        }

        infoWithDispatch(): void {}

        routeWithDispatch(args: RoutingArgs): void {}
    }
})

async function flushPromises() {
    const flush = () => new Promise(setImmediate)
    await flush()
}
