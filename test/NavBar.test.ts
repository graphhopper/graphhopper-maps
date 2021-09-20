import NavBar from '../src/NavBar'
import QueryStore, { QueryPoint, QueryPointType } from '../src/stores/QueryStore'
import DummyApi from './DummyApi'
import { SetPoint, SetVehicleProfile } from '../src/actions/Actions'
import Dispatcher from '../src/stores/Dispatcher'
import { coordinateToText } from '../src/Converters'

// import the window and mock it with jest
import { window } from '../src/Window'
jest.mock('../src/window', () => ({
    window: {
        location: {
            origin: 'https://current.origin',
            pathname: '/',
        },
        history: {
            pushState: jest.fn(),
        },
        addEventListener: jest.fn(),
    },
}))

describe('NavBar', function () {
    afterEach(() => {
        jest.resetAllMocks()
        Dispatcher.clear()
    })

    it('should convert query store state into url params on change', function () {
        // set up navbar with store dependency
        const store = new QueryStore(new DummyApi())
        new NavBar(store)

        // set up the data we want to work with
        const profile = 'my-profile'
        const point1: QueryPoint = {
            ...store.state.queryPoints[0],
            coordinate: { lat: 1, lng: 2 },
            isInitialized: true,
        }
        const point2 = {
            ...store.state.queryPoints[1],
            coordinate: { lat: 10, lng: 10 },
            isInitialized: true,
        }
        const expectedUrl = new URL(window.location.origin + window.location.pathname)
        expectedUrl.searchParams.append('point', coordinateToText(point1.coordinate))
        expectedUrl.searchParams.append('point', coordinateToText(point2.coordinate))
        expectedUrl.searchParams.append('profile', profile)

        store.receive(new SetPoint(point1))
        store.receive(new SetPoint(point2))
        store.receive(new SetVehicleProfile({ name: profile }))

        // the nav bar component should use push state to set a new url
        expect(window.history.pushState).toHaveBeenCalledTimes(3)
        expect(window.history.pushState).toHaveBeenNthCalledWith(3, 'last state', '', expectedUrl.toString())
    })

    it('should parse the url and create a new query state when triggered from outside', () => {
        // set up data
        const point: QueryPoint = {
            coordinate: { lat: 1, lng: 1 },
            id: 0,
            type: QueryPointType.To,
            isInitialized: false,
            queryText: '',
            color: '',
        }
        const profile = 'some-profile'
        const url = new URL(window.location.origin + window.location.pathname)
        url.searchParams.append('point', coordinateToText(point.coordinate))
        url.searchParams.append('profile', profile)

        window.location = {
            ...window.location,
            href: url.toString(),
        }

        // set up functionality
        const store = new QueryStore(new DummyApi())
        Dispatcher.register(store)
        const navBar = new NavBar(store)

        // act
        navBar.parseUrlAndReplaceQuery()

        //assert
        expect(store.state.queryPoints.length).toEqual(2)
        expect(store.state.queryPoints[0].coordinate).toEqual(point.coordinate)
        expect(store.state.queryPoints[0].isInitialized).toEqual(true)
        expect(store.state.queryPoints[1].coordinate).toEqual({ lat: 0, lng: 0 })
        expect(store.state.queryPoints[1].isInitialized).toEqual(false)
        expect(store.state.routingProfile.name).toEqual(profile)

        // make sure the navbar doesn't change the window's location while parsing
        expect(url.toString()).toEqual(window.location.href)
    })

    it('should update the query store state on popstate (back-pressed)', () => {
        const callbacks: { (type: string): void }[] = []
        window.addEventListener = jest.fn((type: any, listener: any) => {
            callbacks.push(listener)
        })

        // set up data
        const point: QueryPoint = {
            coordinate: { lat: 1, lng: 1 },
            id: 0,
            type: QueryPointType.To,
            isInitialized: false,
            queryText: '',
            color: '',
        }
        const profile = 'some-profile'
        const url = new URL(window.location.origin + window.location.pathname)
        url.searchParams.append('point', coordinateToText(point.coordinate))
        url.searchParams.append('profile', profile)

        window.location = {
            ...window.location,
            href: url.toString(),
        }

        // set up functionality
        const store = new QueryStore(new DummyApi())
        Dispatcher.register(store)
        new NavBar(store)

        // act
        callbacks.forEach(callback => callback('popstate'))

        // assert
        expect(store.state.queryPoints.length).toEqual(2)
        expect(store.state.queryPoints[0].coordinate).toEqual(point.coordinate)
        expect(store.state.queryPoints[0].isInitialized).toEqual(true)
        expect(store.state.queryPoints[1].coordinate).toEqual({ lat: 0, lng: 0 })
        expect(store.state.queryPoints[1].isInitialized).toEqual(false)
        expect(store.state.routingProfile.name).toEqual(profile)

        // make sure the navbar doesn't change the window's location while parsing
        expect(url.toString()).toEqual(window.location.href)
    })
})
