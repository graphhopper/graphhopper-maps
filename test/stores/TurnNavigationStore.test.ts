import Dispatcher from '@/stores/Dispatcher'
import { LocationUpdate, SetSelectedPath, SetVehicleProfile } from '@/actions/Actions'
import TurnNavigationStore from '@/stores/TurnNavigationStore'
import { SpeechSynthesizer } from '@/SpeechSynthesizer'
import { ApiInfo, GeocodingResult, RawResult, RoutingArgs, RoutingResult } from '@/api/graphhopper'
import Api, { ApiImpl } from '@/api/Api'
import { setTranslation } from '@/translation/Translation'
import { Coordinate } from '@/stores/QueryStore'

let routeWithVia = toRoutingResult(require('../turnNavigation/response-hoyerswerda2.json'))
let reroute = toRoutingResult(require('../turnNavigation/response-hoyerswerda3.json'))
let routeWithSimpleVia = toRoutingResult(require('../turnNavigation/response-hoyerswerda4.json'))

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

            // not close enough and no passing
            expect(
                TurnNavigationStore.skipWaypoint(
                    58,
                    { lng: 14.081976, lat: 51.420467 },
                    { lng: 14.082183, lat: 51.420978 },
                    { lng: 14.083116, lat: 51.420814 }
                )
            ).toBeFalsy()

            // not close enough but rough passing
            expect(
                TurnNavigationStore.skipWaypoint(
                    58,
                    { lng: 14.081976, lat: 51.420467 },
                    { lng: 14.082183, lat: 51.420978 },
                    { lng: 14.082424, lat: 51.419894 }
                )
            ).toBeTruthy()

            // not close enough but typical situation of passing by
            expect(
                TurnNavigationStore.skipWaypoint(
                    72,
                    { lng: 14.073986, lat: 51.419021 },
                    { lng: 14.07319, lat: 51.418877 },
                    { lng: 14.074043, lat: 51.418791 }
                )
            ).toBeTruthy()
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
            const store = createStore()
            Dispatcher.dispatch(new SetSelectedPath(reroute.paths[0]))
            expect(store.state.initialPath).toEqual(reroute.paths[0])
        })

        it('should reroute', async () => {
            // why 00000000001?
            const rerouteWaypoints = [
                [14.266328, 51.434653],
                [14.267240000000001, 51.43253000000001],
            ] as [number, number][]
            const store = createStore(reroute, rerouteWaypoints)
            Dispatcher.dispatch(new SetSelectedPath(reroute.paths[0]))
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.266959, lat: 51.435051 }, 10, 120))
            expect(store.state.speed).toEqual(10)
            expect(store.state.activePath).toEqual(reroute.paths[0])
            expect(store.state.instruction.index).toEqual(1)

            // no rerouting without profile
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.268302, lat: 51.435232 }, 12, 120))
            expect(store.state.speed).toEqual(12)
            expect(store.state.rerouteInProgress).toBeFalsy()

            Dispatcher.dispatch(new SetVehicleProfile({ name: 'car' }))
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.266328, lat: 51.434653 }, 12, 120))
            expect(store.state.speed).toEqual(12)
            expect(store.state.rerouteInProgress).toBeTruthy()
            await flushPromises()
            expect(store.state.rerouteInProgress).toBeFalsy()

            expect(store.state.activePath).toEqual(reroute.paths[0])
            expect(store.state.instruction.index).toEqual(1)
        })

        it('should reroute with via point', async () => {
            const rerouteWaypoints = [
                [14.269289, 51.434764],
                [14.26725, 51.43253000000001],
            ] as [number, number][]
            const store = createStore(reroute, rerouteWaypoints)
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

            expect(store.state.activePath?.distance).toEqual(reroute.paths[0].distance)
            expect(store.state.instruction.index).toEqual(1)
        })

        it('should reroute with via point passing by', async () => {
            const rerouteWaypoints = [
                [14.269289, 51.434764],
                [14.26725, 51.43253],
            ] as [number, number][]
            const store = createStore(reroute, rerouteWaypoints)
            Dispatcher.dispatch(new SetSelectedPath(routeWithSimpleVia.paths[0]))
            Dispatcher.dispatch(new SetVehicleProfile({ name: 'car' }))
            Dispatcher.dispatch(new LocationUpdate({ lng: 51.436269, lat: 14.2727 }, 10, 120))
            expect(store.state.activePath).toEqual(routeWithSimpleVia.paths[0])

            // close to middle waypoint but not within 50m
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.269289, lat: 51.434764 }, 12, 70))
            expect(store.state.speed).toEqual(12)

            // close to middle waypoint but not within 50m but still rerouting as more than 50m to previous location
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.269289, lat: 51.434764 }, 14, 70))
            expect(store.state.speed).toEqual(14)

            expect(store.state.rerouteInProgress).toBeTruthy()
            await flushPromises()
            expect(store.state.rerouteInProgress).toBeFalsy()

            expect(store.state.activePath?.distance).toEqual(reroute.paths[0].distance)
            expect(store.state.instruction.index).toEqual(1)
        })
    })

    function createStore(resultOnReroute?: RoutingResult, wayPointsInQuery?: [number, number][]) {
        const store = new TurnNavigationStore(
            new LocalApi(resultOnReroute ? resultOnReroute : ({} as RoutingResult), wayPointsInQuery),
            new DummySpeech(),
            true
        )
        Dispatcher.register(store)
        return store
    }

    class DummySpeech implements SpeechSynthesizer {
        synthesize(text: string, offline = true) {
            // TODO we could collect the text to ensure spoken words
        }
    }

    class LocalApi implements Api {
        readonly resultOnReroute
        readonly wayPointsInQuery

        constructor(resultOnReroute: RoutingResult, wayPointsInQuery?: [number, number][]) {
            this.resultOnReroute = resultOnReroute
            this.wayPointsInQuery = wayPointsInQuery
        }

        route(args: RoutingArgs): Promise<RoutingResult> {
            if (this.wayPointsInQuery) expect(args.points).toEqual(this.wayPointsInQuery)
            return Promise.resolve(this.resultOnReroute)
        }

        geocode(query: string): Promise<GeocodingResult> {
            return Promise.resolve({
                took: 0,
                hits: [],
            })
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
