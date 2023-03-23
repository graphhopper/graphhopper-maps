import RouteStore from '@/stores/RouteStore'
import QueryStore, { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import Api from '@/api/Api'
import { ApiInfo, GeocodingResult, Path, RoutingArgs, RoutingResult } from '@/api/graphhopper'
import Dispatcher, { Action } from '@/stores/Dispatcher'
import { ClearPoints, ClearRoute, RemovePoint, SetPoint, SetSelectedPath } from '@/actions/Actions'

describe('RouteStore', () => {
    afterEach(() => {
        Dispatcher.clear()
    })

    describe('clear route information', () => {
        it('should revert to initial state on ClearPoints Action', () => {
            executeTest(new SetPoint(createEmptyQueryPoint(), true))
        })
        it('should revert to initial state on ClearRoute Action', () => {
            executeTest(new ClearRoute())
        })
        it('should revert to initial state on SetPoint Action', () => {
            executeTest(new ClearPoints())
        })
        it('should revert to initial state on RemovePoint Action', () => {
            executeTest(new RemovePoint(createEmptyQueryPoint()))
        })

        function executeTest(action: Action) {
            const store = createStore()
            const initialState = store.state

            Dispatcher.dispatch(action)

            expect(store.state).toEqual(initialState)
        }
    })

    it('Should set selected path', () => {
        const store = createStore()
        const pathToSelect: Path = {
            ...store.state.selectedPath,
            distance: 1000,
        }

        Dispatcher.dispatch(new SetSelectedPath(pathToSelect))

        expect(store.state.selectedPath).toEqual(pathToSelect)
    })
})

function createStore() {
    const store = new RouteStore(new QueryStore(new DummyApi()))
    Dispatcher.register(store)
    return store
}

function createEmptyQueryPoint(): QueryPoint {
    return {
        isInitialized: false,
        queryText: '',
        coordinate: { lat: 0, lng: 0 },
        id: 0,
        color: '',
        type: QueryPointType.To,
    }
}

class DummyApi implements Api {
    geocode(query: string): Promise<GeocodingResult> {
        throw Error('not implemented')
    }

    info(): Promise<ApiInfo> {
        throw Error('not implemented')
    }

    route(args: RoutingArgs): Promise<RoutingResult> {
        throw Error('not implemented')
    }

    routeWithDispatch(args: RoutingArgs): void {}

    supportsGeocoding(): boolean {
        return false
    }
}
