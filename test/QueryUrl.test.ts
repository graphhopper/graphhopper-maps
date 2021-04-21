import { createUrl, parseUrl } from '../src/QueryUrl'
import { QueryPoint, QueryPointType, QueryStoreState, Coordinate } from '../src/stores/QueryStore'
import Dispatcher, { Action } from '../src/stores/Dispatcher'
import Store from '../src/stores/Store'
import { AddPoint, SetVehicle } from '../src/actions/Actions'
import { RoutingVehicle } from '../src/api/graphhopper'

interface TestState {
    points: Coordinate[]
    vehicle: RoutingVehicle
}
class TestStore extends Store<TestState> {
    protected getInitialState(): TestState {
        return {
            points: [],
            vehicle: { import_date: '', features: { elevation: false }, version: '', key: '' },
        }
    }

    reduce(state: TestState, action: Action): TestState {
        if (action instanceof AddPoint) {
            state.points.push(action.coordinate)
            return {
                ...state,
                points: state.points,
            }
        } else if (action instanceof SetVehicle) {
            return {
                ...state,
                vehicle: action.vehicle,
            }
        }
        return state
    }
}

afterEach(() => Dispatcher.clear())

describe('parseUrl', () => {
    it('should parse parameters from a url', () => {
        const vehicle = 'car'
        const point1 = [50.67724646887518, 7.275303695325306] as [number, number]
        const point2 = [50.28050431501495, 10.81515858598078] as [number, number]
        const url = `http://localhost:3000/?point=${point1.join(',')}&point=${point2.join(',')}&vehicle=${vehicle}`

        const store = new TestStore()
        Dispatcher.register(store)

        parseUrl(url, {
            queryPoints: [],
            nextQueryPointId: 0,
            currentRequest: { subRequests: [] },
            maxAlternativeRoutes: 1,
            routingVehicle: store.state.vehicle,
        })

        expect(store.state.points.length).toEqual(2)
        expect(store.state.points[0]).toEqual({ lat: point1[0], lng: point1[1] })
        expect(store.state.points[1]).toEqual({ lat: point2[0], lng: point2[1] })
        expect(store.state.vehicle.key).toEqual(vehicle)
    })
    it('should create an empty request when no points are supplied', () => {
        const url = `http://localhost:3000/?`

        Dispatcher.register({
            receive() {
                fail('parsing an empty url should not raise any actions')
            },
        })

        parseUrl(url, getQueryStoreState())

        // if we don't fail until here everything is fine
    })

    it('should ignore unknown params', () => {
        const vehicle = 'car'
        const url = `http://localhost:3000/?vehicle=${vehicle}&some-param=some-value`

        let vehicleFromAction: RoutingVehicle

        Dispatcher.register({
            receive(action: Action) {
                if (action instanceof SetVehicle) {
                    vehicleFromAction = action.vehicle
                } else {
                    fail('Unexpected action received')
                }
            },
        })

        parseUrl(url, getQueryStoreState())

        expect(vehicleFromAction!.key).toEqual(vehicle)
    })

    it('should raise an error if a point is not in the expected format', () => {
        const point1 = [50.67724646887518, 7.275303695325306, 1.0]
        const url = `http://localhost:3000/?point=${point1.join(',')}`

        expect(() => parseUrl(url, getQueryStoreState())).toThrowError()
    })
})

describe('createUrl', () => {
    it('should convert points of a request into url params', () => {
        const point1 = [50.677246,  7.275303] as [number, number]
        const point2 = [50.280504, 10.815158] as [number, number]
        const vehicle = 'vehicle-type'
        const expectedUrl = new URL('http://localhost:3000/')
        expectedUrl.searchParams.append('point', point1.join(','))
        expectedUrl.searchParams.append('point', point2.join(','))
        expectedUrl.searchParams.append('vehicle', vehicle)

        const emptyState = getQueryStoreState()

        const result = createUrl(expectedUrl.origin, {
            routingVehicle: { ...emptyState.routingVehicle, key: vehicle },
            nextQueryPointId: 0,
            maxAlternativeRoutes: 1,
            currentRequest: { subRequests: [] },
            queryPoints: [coordinateToQueryPoint(point1, 1), coordinateToQueryPoint(point2, 2)],
        })

        expect(result).toEqual(expectedUrl)
    })
})

function getQueryStoreState(): QueryStoreState {
    return {
        queryPoints: [],
        nextQueryPointId: 0,
        currentRequest: { subRequests: [] },
        maxAlternativeRoutes: 1,
        routingVehicle: { import_date: '', features: { elevation: false }, version: '', key: '' },
    }
}

function coordinateToQueryPoint(coordinate: [number, number], id: number): QueryPoint {
    return {
        isInitialized: true,
        coordinate: new Coordinate(coordinate[0], coordinate[1]),
        queryText: '',
        id: id,
        color: '',
        type: QueryPointType.Via,
    }
}
