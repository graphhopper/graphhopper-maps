import Dispatcher from '@/stores/Dispatcher'
import { LocationUpdate, SetSelectedPath, SetVehicleProfile } from '@/actions/Actions'
import TurnNavigationStore from '@/stores/TurnNavigationStore'
import { SpeechSynthesizer } from '@/SpeechSynthesizer'
import { ApiInfo, GeocodingResult, Path, RawResult, RoutingArgs, RoutingResult } from '@/api/graphhopper'
import Api, { ApiImpl } from '@/api/Api'
import { setTranslation } from '@/translation/Translation'

let routeWithVia = toRoutingResult(require('../turnNavigation/response-hoyerswerda2.json'))
let reroute = toRoutingResult(require('../turnNavigation/response-hoyerswerda3.json'))

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

    describe('path state handling', () => {
        it('should set path', () => {
            const store = createStore(reroute)
            Dispatcher.dispatch(new SetSelectedPath(reroute.paths[0]))
            expect(store.state.initialPath).toEqual(reroute.paths[0])
        })

        it('should reroute', async () => {
            const store = createStore(reroute)
            Dispatcher.dispatch(new SetSelectedPath(routeWithVia.paths[0]))
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.266959, lat: 51.435051 }, 10, 120))
            expect(store.state.speed).toEqual(10)
            expect(store.state.activePath).toEqual(routeWithVia.paths[0])
            expect(store.state.instruction.index).toEqual(1)

            // no rerouting without profile
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.268302, lat: 51.435232 }, 12, 120))
            expect(store.state.speed).toEqual(12)
            expect(store.state.rerouteInProgress).toBeFalsy()

            Dispatcher.dispatch(new SetVehicleProfile({ name: 'car' }))
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.268302, lat: 51.435232 }, 12, 120))
            expect(store.state.speed).toEqual(12)
            expect(store.state.rerouteInProgress).toBeTruthy()
            await flushPromises()
            expect(store.state.rerouteInProgress).toBeFalsy()

            expect(store.state.activePath).toEqual(reroute.paths[0])
            expect(store.state.instruction.index).toEqual(1)
        })

        it('should reroute with via point', async () => {
            const store = createStore(reroute)
            Dispatcher.dispatch(new SetSelectedPath(routeWithVia.paths[0]))
            Dispatcher.dispatch(new SetVehicleProfile({ name: 'car' }))
            Dispatcher.dispatch(new LocationUpdate({ lng: 14.266959, lat: 51.435051 }, 10, 120))
            expect(store.state.speed).toEqual(10)
            expect(store.state.instruction.index).toEqual(1)
            expect(store.state.activePath).toEqual(routeWithVia.paths[0])

            // TODO NOW
            // close to via point it should force rerouting to avoid potential interferences with overlapping edges
            // Dispatcher.dispatch(new LocationUpdate({ lng: 14.269289, lat: 51.434764 }, 12, 70))
            // expect(store.state.speed).toEqual(12)
            //
            // expect(store.state.rerouteInProgress).toBeTruthy()
            // await flushPromises()
            // expect(store.state.rerouteInProgress).toBeFalsy()
            //
            // expect(store.state.activePath).toEqual(reroute.paths[0])
            // expect(store.state.instruction.index).toEqual(1)
        })
    })

    function createStore(resultOnReroute: RoutingResult) {
        const store = new TurnNavigationStore(new LocalApi(resultOnReroute), new DummySpeech(), true)
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

        constructor(resultOnReroute: RoutingResult) {
            this.resultOnReroute = resultOnReroute
        }

        route(args: RoutingArgs): Promise<RoutingResult> {
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
