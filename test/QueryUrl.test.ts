import { createUrl, parseUrl } from '../src/QueryUrl'
import { QueryPoint, QueryPointType, QueryStoreState, Coordinate } from '../src/stores/QueryStore'
import Dispatcher, { Action } from '../src/stores/Dispatcher'
import Store from '../src/stores/Store'
import { AddPoint, SetVehicleProfile } from '../src/actions/Actions'
import { RoutingProfile } from '../src/api/graphhopper'

interface TestState {
    points: Coordinate[]
    profile: RoutingProfile
}
class TestStore extends Store<TestState> {
    protected getInitialState(): TestState {
        return {
            points: [],
            profile: { key: '' },
        }
    }

    reduce(state: TestState, action: Action): TestState {
        if (action instanceof AddPoint) {
            state.points.push(action.coordinate)
            return {
                ...state,
                points: state.points,
            }
        } else if (action instanceof SetVehicleProfile) {
            return {
                ...state,
                profile: action.profile,
            }
        }
        return state
    }
}

afterEach(() => Dispatcher.clear())

describe('parseUrl', () => {
    it('should parse parameters from a url', () => {
        const profile = 'car'
        const point1 = [50.67724646887518, 7.275303695325306] as [number, number]
        const point2 = [50.28050431501495, 10.81515858598078] as [number, number]
        const url = `http://localhost:3000/?point=${point1.join(',')}&point=${point2.join(',')}&profile=${profile}`

        const store = new TestStore()
        Dispatcher.register(store)

        parseUrl(url, {
            queryPoints: [],
            nextQueryPointId: 0,
            currentRequest: { subRequests: [] },
            maxAlternativeRoutes: 1,
            routingProfile: store.state.profile,
        })

        expect(store.state.points.length).toEqual(2)
        expect(store.state.points[0]).toEqual({ lat: point1[0], lng: point1[1] })
        expect(store.state.points[1]).toEqual({ lat: point2[0], lng: point2[1] })
        expect(store.state.profile.key).toEqual(profile)
    })
    it('set default profile when no parameters are supplied', () => {
        const url = `http://localhost:3000/?`

        let profileFromAction: RoutingProfile

        Dispatcher.register({
            receive(action: Action) {
                if (action instanceof SetVehicleProfile) {
                    profileFromAction = action.profile
                } else {
                    fail('Unexpected action received')
                }
            },
        })

        parseUrl(url, getQueryStoreState())

        expect(profileFromAction!.key).toEqual('car')
    })

    it('should ignore unknown params', () => {
        const profile = 'car'
        const url = `http://localhost:3000/?profile=${profile}&some-param=some-value`

        let profileFromAction: RoutingProfile

        Dispatcher.register({
            receive(action: Action) {
                if (action instanceof SetVehicleProfile) {
                    profileFromAction = action.profile
                } else {
                    fail('Unexpected action received')
                }
            },
        })

        parseUrl(url, getQueryStoreState())

        expect(profileFromAction!.key).toEqual(profile)
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
        const profile = 'profile-type'
        const expectedUrl = new URL('http://localhost:3000/')
        expectedUrl.searchParams.append('point', point1.join(','))
        expectedUrl.searchParams.append('point', point2.join(','))
        expectedUrl.searchParams.append('profile', profile)

        const emptyState = getQueryStoreState()

        const result = createUrl(expectedUrl.origin, {
            routingProfile: { ...emptyState.routingProfile, key: profile },
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
        routingProfile: { key: '' },
    }
}

function coordinateToQueryPoint(coordinate: [number, number], id: number): QueryPoint {
    return {
        isInitialized: true,
        coordinate: { lat: coordinate[0], lng: coordinate[1] },
        queryText: '',
        id: id,
        color: '',
        type: QueryPointType.Via,
    }
}
