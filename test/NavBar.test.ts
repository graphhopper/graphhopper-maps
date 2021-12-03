import NavBar from '@/NavBar'
import QueryStore, { QueryPoint, QueryPointType } from '../src/stores/QueryStore'
import DummyApi from './DummyApi'
import { SelectMapStyle, SetPoint, SetVehicleProfile } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import { coordinateToText } from '@/Converters'

// import the window and mock it with jest
import { window } from '@/Window'
import MapOptionsStore from '@/stores/MapOptionsStore'
import * as config from 'config'

jest.mock('@/Window', () => ({
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
        const queryStore = new QueryStore(new DummyApi())
        const mapStore = new MapOptionsStore()
        new NavBar(queryStore, mapStore)

        // set up the data we want to work with
        const profile = 'my-profile'
        const layer = 'Lyrk'
        const point1: QueryPoint = {
            ...queryStore.state.queryPoints[0],
            coordinate: { lat: 1, lng: 2 },
            isInitialized: true,
        }
        const point2 = {
            ...queryStore.state.queryPoints[1],
            coordinate: { lat: 10, lng: 10 },
            isInitialized: true,
        }
        const expectedUrl = new URL(window.location.origin + window.location.pathname)
        expectedUrl.searchParams.append('point', coordinateToText(point1.coordinate))
        expectedUrl.searchParams.append('point', coordinateToText(point2.coordinate))
        expectedUrl.searchParams.append('profile', profile)
        expectedUrl.searchParams.append('layer', layer)

        queryStore.receive(new SetPoint(point1))
        queryStore.receive(new SetPoint(point2))
        queryStore.receive(new SetVehicleProfile({ name: profile }))
        mapStore.receive(new SelectMapStyle({ name: layer, url: '', type: 'vector', attribution: '' }))

        // the nav bar component should use push state to set a new url
        expect(window.history.pushState).toHaveBeenCalledTimes(4)
        expect(window.history.pushState).toHaveBeenNthCalledWith(4, 'last state', '', expectedUrl.toString())
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
        const layer = 'Omniscale'
        const url = new URL(window.location.origin + window.location.pathname)
        url.searchParams.append('point', coordinateToText(point.coordinate))
        url.searchParams.append('profile', profile)
        url.searchParams.append('layer', layer)

        window.location = {
            ...window.location,
            href: url.toString(),
        }

        // set up functionality
        const queryStore = new QueryStore(new DummyApi())
        const mapStore = new MapOptionsStore()
        Dispatcher.register(queryStore)
        Dispatcher.register(mapStore)
        const navBar = new NavBar(queryStore, mapStore)

        // act
        navBar.parseUrlAndReplaceQuery()

        //assert
        expect(queryStore.state.queryPoints.length).toEqual(2)
        expect(queryStore.state.queryPoints[0].coordinate).toEqual(point.coordinate)
        expect(queryStore.state.queryPoints[0].isInitialized).toEqual(true)
        expect(queryStore.state.queryPoints[1].coordinate).toEqual({ lat: 0, lng: 0 })
        expect(queryStore.state.queryPoints[1].isInitialized).toEqual(false)
        expect(queryStore.state.routingProfile.name).toEqual(profile)

        expect(mapStore.state.selectedStyle.name).toEqual(layer)

        // make sure the navbar doesn't change the window's location while parsing
        expect(url.toString()).toEqual(window.location.href)
    })

    it('should parse the url and set defaults for layer if not provided', () => {
        window.location = {
            ...window.location,
            href: 'https://origin.com',
        }

        // set up functionality
        const queryStore = new QueryStore(new DummyApi())
        const mapStore = new MapOptionsStore()
        Dispatcher.register(queryStore)
        Dispatcher.register(mapStore)
        const navBar = new NavBar(queryStore, mapStore)

        // act
        navBar.parseUrlAndReplaceQuery()

        //assert
        expect(queryStore.state.queryPoints.length).toEqual(2)
        expect(queryStore.state.queryPoints[0].isInitialized).toEqual(false)
        expect(queryStore.state.queryPoints[1].isInitialized).toEqual(false)
        expect(queryStore.state.routingProfile.name).toEqual('')

        expect(mapStore.state.selectedStyle.name).toEqual(config.defaultTiles)
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
        const layer = 'Omniscale'
        const url = new URL(window.location.origin + window.location.pathname)
        url.searchParams.append('point', coordinateToText(point.coordinate))
        url.searchParams.append('profile', profile)
        url.searchParams.append('layer', layer)

        window.location = {
            ...window.location,
            href: url.toString(),
        }

        // set up functionality
        const queryStore = new QueryStore(new DummyApi())
        const mapStore = new MapOptionsStore()
        Dispatcher.register(queryStore)
        Dispatcher.register(mapStore)
        new NavBar(queryStore, mapStore)

        // act
        callbacks.forEach(callback => callback('popstate'))

        // assert
        expect(queryStore.state.queryPoints.length).toEqual(2)
        expect(queryStore.state.queryPoints[0].coordinate).toEqual(point.coordinate)
        expect(queryStore.state.queryPoints[0].isInitialized).toEqual(true)
        expect(queryStore.state.queryPoints[1].coordinate).toEqual({ lat: 0, lng: 0 })
        expect(queryStore.state.queryPoints[1].isInitialized).toEqual(false)
        expect(queryStore.state.routingProfile.name).toEqual(profile)

        expect(mapStore.state.selectedStyle.name).toEqual(layer)

        // make sure the navbar doesn't change the window's location while parsing
        expect(url.toString()).toEqual(window.location.href)
    })
})
