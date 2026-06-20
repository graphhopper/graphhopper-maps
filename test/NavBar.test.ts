// We use jsdom (some imported modules touch window at load) but jsdom doesn't
// expose CompressionStream / Blob globally — pull them in from Node so the
// compression code paths can be exercised. Localized here so we don't need a
// jest setup file.
if (typeof (globalThis as any).CompressionStream === 'undefined') {
    const sw = require('stream/web')
    ;(globalThis as any).CompressionStream = sw.CompressionStream
    ;(globalThis as any).DecompressionStream = sw.DecompressionStream
    ;(globalThis as any).ReadableStream = sw.ReadableStream
    ;(globalThis as any).WritableStream = sw.WritableStream
    ;(globalThis as any).TransformStream = sw.TransformStream
}
if (typeof (globalThis as any).TextEncoder === 'undefined') {
    const util = require('util')
    ;(globalThis as any).TextEncoder = util.TextEncoder
    ;(globalThis as any).TextDecoder = util.TextDecoder
}

import NavBar from '@/NavBar'
import QueryStore, { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import DummyApi from './DummyApi'
import {
    SelectMapLayer,
    SetCustomModel,
    SetPoint,
    SetQueryPoints,
    SetVehicleProfile,
} from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import { coordinateToText } from '@/Converters'
import { encodeCoords } from '@/util/flexPolyline'
import { deflateB64url } from '@/util/urlCompress'
import * as urlCompress from '@/util/urlCompress'

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
            replaceState: jest.fn(),
        },
        addEventListener: jest.fn(),
    },
}))

// Flush pending microtasks + macrotask ticks so async URL updates settle.
// CompressionStream involves several stream-pipe hops, so we wait a few ticks.
async function flush() {
    for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0))
}

// Helper to build N initialized query points. QueryStore starts with 2 default
// empty points; for N>2 we need to replace the whole array via SetQueryPoints
// since SetPoint only replaces an existing point by id.
function makePoints(defs: { lat: number; lng: number; text?: string }[]): QueryPoint[] {
    return defs.map((d, i) => ({
        coordinate: { lat: d.lat, lng: d.lng },
        queryText: d.text ?? coordinateToText({ lat: d.lat, lng: d.lng }),
        isInitialized: true,
        id: i,
        color: '',
        type: QueryPointType.Via,
    }))
}

describe('NavBar', function () {
    let queryStore: QueryStore
    let mapStore: MapOptionsStore
    let navBar: NavBar
    let callbacks: { (type: string): void }[]

    beforeEach(() => {
        // because we mock the global 'window' object, we also need to mock event listeners.
        // this must be done before 'new NavBar' is called below, since this subscribes as event listener
        callbacks = []
        window.addEventListener = jest.fn((type: any, listener: any) => {
            callbacks.push(listener)
        })
        queryStore = new QueryStore(new DummyApi())
        mapStore = new MapOptionsStore()
        navBar = new NavBar(queryStore, mapStore)
        navBar.startSyncingUrlWithAppState()
        Dispatcher.register(queryStore)
        Dispatcher.register(mapStore)
    })

    afterEach(() => {
        jest.resetAllMocks()
        Dispatcher.clear()
    })

    function lastPushedUrl(): URL {
        const calls = (window.history.pushState as jest.Mock).mock.calls
        return new URL(calls[calls.length - 1][2])
    }

    describe('state to url', () => {
        it('emits legacy point= for 2-3 initialized points (below fpolyline threshold)', async () => {
            queryStore.receive(new SetQueryPoints(makePoints([{ lat: 1, lng: 2 }, { lat: 10, lng: 10 }])))
            queryStore.receive(new SetVehicleProfile({ name: 'car' }))
            mapStore.receive(new SelectMapLayer('Cyclosm'))
            await flush()

            const url = lastPushedUrl()
            expect(url.searchParams.has('fpolyline')).toEqual(false)
            expect(url.searchParams.getAll('point')).toEqual(['1,2', '10,10'])
        })

        it('emits fpolyline (no names) for 4+ initialized points', async () => {
            const coords = [
                { lat: 1, lng: 2 },
                { lat: 3, lng: 4 },
                { lat: 5, lng: 6 },
                { lat: 7, lng: 8 },
            ]
            queryStore.receive(new SetQueryPoints(makePoints(coords)))
            queryStore.receive(new SetVehicleProfile({ name: 'car' }))
            mapStore.receive(new SelectMapLayer('Cyclosm'))
            await flush()

            const url = lastPushedUrl()
            expect(url.searchParams.get('fpolyline')).toEqual(encodeCoords(coords))
            expect(url.searchParams.has('cnames')).toEqual(false)
            expect(url.searchParams.getAll('point').length).toEqual(0)
        })

        it('emits fpolyline + cnames (always compressed) when any of the 4+ points has a custom name', async () => {
            queryStore.receive(
                new SetQueryPoints(
                    makePoints([
                        { lat: 1, lng: 2, text: 'Berlin' },
                        { lat: 3, lng: 4 },
                        { lat: 5, lng: 6, text: 'Paris' },
                        { lat: 7, lng: 8 },
                    ]),
                ),
            )
            queryStore.receive(new SetVehicleProfile({ name: 'car' }))
            mapStore.receive(new SelectMapLayer('Cyclosm'))
            await flush()

            const url = lastPushedUrl()
            expect(url.searchParams.has('fpolyline')).toEqual(true)
            expect(url.searchParams.has('cnames')).toEqual(true)
            expect(url.searchParams.has('name')).toEqual(false)
        })

        it('falls back to legacy point= when not all points are initialized', async () => {
            const existing = queryStore.state.queryPoints[0]
            queryStore.receive(
                new SetPoint(
                    { ...existing, coordinate: { lat: 11, lng: 12 }, queryText: '11,12', isInitialized: true },
                    true,
                ),
            )
            queryStore.receive(new SetVehicleProfile({ name: 'car' }))
            mapStore.receive(new SelectMapLayer('Cyclosm'))
            await flush()

            const url = lastPushedUrl()
            expect(url.searchParams.has('fpolyline')).toEqual(false)
            expect(url.searchParams.getAll('point').length).toEqual(2)
        })

        it('emits l=<shortName> (not layer=<fullName>) for the selected map style', async () => {
            queryStore.receive(new SetQueryPoints(makePoints([{ lat: 1, lng: 2 }, { lat: 10, lng: 10 }])))
            queryStore.receive(new SetVehicleProfile({ name: 'car' }))
            mapStore.receive(new SelectMapLayer('Omniscale'))
            await flush()

            const url = lastPushedUrl()
            expect(url.searchParams.get('l')).toEqual('oms')
            expect(url.searchParams.has('layer')).toEqual(false)
        })

        it('always emits cmodel (compressed) when custom model is enabled', async () => {
            const cm = '{"distance_influence":15}'
            queryStore.receive(new SetQueryPoints(makePoints([{ lat: 1, lng: 2 }, { lat: 10, lng: 10 }])))
            queryStore.receive(new SetVehicleProfile({ name: 'car' }))
            mapStore.receive(new SelectMapLayer('Cyclosm'))
            queryStore.receive(new SetCustomModel(cm, true))
            await flush()

            const url = lastPushedUrl()
            expect(url.searchParams.has('cmodel')).toEqual(true)
            expect(url.searchParams.has('custom_model')).toEqual(false)
        })
    })

    describe('url to state', () => {
        it('parses legacy point=lat,lng_name URLs', async () => {
            const point: QueryPoint = {
                coordinate: { lat: 1, lng: 1 },
                id: 0,
                type: QueryPointType.To,
                isInitialized: false,
                queryText: 'some1address-with!/<symb0ls',
                color: '',
            }
            const url = new URL(window.location.origin + window.location.pathname)
            url.searchParams.append('point', coordinateToText(point.coordinate) + '_' + point.queryText)
            url.searchParams.append('profile', 'some-profile')
            url.searchParams.append('layer', 'Omniscale')
            window.location.href = url.toString()

            await navBar.updateStateFromUrl()

            expect(queryStore.state.queryPoints.length).toEqual(2)
            expect(queryStore.state.queryPoints[0].coordinate).toEqual(point.coordinate)
            expect(queryStore.state.queryPoints[0].isInitialized).toEqual(true)
            expect(queryStore.state.queryPoints[0].queryText).toEqual(point.queryText)
            expect(queryStore.state.routingProfile.name).toEqual('some-profile')
            expect(mapStore.state.selectedStyle.name).toEqual('Omniscale')
        })

        it('parses fpolyline URL roundtrip', async () => {
            const coords = [
                { lat: 51.106229, lng: 13.679849 },
                { lat: 51.049329, lng: 13.738144 },
                { lat: 50.987800, lng: 13.687515 },
                { lat: 50.876543, lng: 13.512345 },
            ]
            const url = new URL(window.location.origin + window.location.pathname)
            url.searchParams.append('fpolyline', encodeCoords(coords))
            url.searchParams.append('profile', 'car')
            url.searchParams.append('layer', 'Omniscale')
            window.location.href = url.toString()

            await navBar.updateStateFromUrl()

            expect(queryStore.state.queryPoints.length).toEqual(coords.length)
            for (let i = 0; i < coords.length; i++) {
                expect(queryStore.state.queryPoints[i].coordinate.lat).toBeCloseTo(coords[i].lat, 6)
                expect(queryStore.state.queryPoints[i].coordinate.lng).toBeCloseTo(coords[i].lng, 6)
                expect(queryStore.state.queryPoints[i].isInitialized).toEqual(true)
            }
        })

        it('parses fpolyline + cnames URL (and roundtrip strips * from names on write)', async () => {
            const coords = [
                { lat: 1, lng: 2 },
                { lat: 3, lng: 4 },
                { lat: 5, lng: 6 },
                { lat: 7, lng: 8 },
            ]
            const cnames = await deflateB64url('München*Wien*Krakow*Prague')
            const url = new URL(window.location.origin + window.location.pathname)
            url.searchParams.append('fpolyline', encodeCoords(coords))
            url.searchParams.append('cnames', cnames)
            url.searchParams.append('profile', 'car')
            url.searchParams.append('layer', 'Omniscale')
            window.location.href = url.toString()

            await navBar.updateStateFromUrl()

            expect(queryStore.state.queryPoints.map(p => p.queryText)).toEqual(['München', 'Wien', 'Krakow', 'Prague'])

            // Inject a '*' into one queryText and verify it gets stripped on re-emission.
            queryStore.receive(
                new SetPoint(
                    { ...queryStore.state.queryPoints[0], queryText: 'A*star', isInitialized: true },
                    true,
                ),
            )
            await flush()
            const reEmitted = lastPushedUrl()
            window.location.href = reEmitted.toString()
            await navBar.updateStateFromUrl()
            expect(queryStore.state.queryPoints[0].queryText).toEqual('Astar')
        })

        it('parses cmodel (compressed custom model) URL', async () => {
            const cm = '{"distance_influence":15,"priority":[],"speed":[],"areas":{}}'
            const cmodel = await deflateB64url(cm)
            const url = new URL(window.location.origin + window.location.pathname)
            url.searchParams.append('point', '1,2')
            url.searchParams.append('point', '3,4')
            url.searchParams.append('cmodel', cmodel)
            url.searchParams.append('profile', 'car')
            url.searchParams.append('layer', 'Omniscale')
            window.location.href = url.toString()

            await navBar.updateStateFromUrl()

            expect(queryStore.state.customModelEnabled).toEqual(true)
            // stored value is pretty-printed, so compare JSON semantically
            expect(JSON.parse(queryStore.state.customModelStr)).toEqual(JSON.parse(cm))
        })

        it('parses legacy custom_model= URL', async () => {
            const cm = '{"distance_influence":15}'
            const url = new URL(window.location.origin + window.location.pathname)
            url.searchParams.append('point', '1,2')
            url.searchParams.append('point', '3,4')
            url.searchParams.append('custom_model', cm)
            url.searchParams.append('profile', 'car')
            url.searchParams.append('layer', 'Omniscale')
            window.location.href = url.toString()

            await navBar.updateStateFromUrl()

            expect(queryStore.state.customModelEnabled).toEqual(true)
            expect(JSON.parse(queryStore.state.customModelStr)).toEqual(JSON.parse(cm))
        })

        it('sets no points when no points are in URL', async () => {
            window.location.href = 'https://origin.com'
            const point1 = queryStore.state.queryPoints[0]
            const point2 = queryStore.state.queryPoints[1]

            await navBar.updateStateFromUrl()

            expect(queryStore.state.queryPoints.length).toEqual(2)
            expect(queryStore.state.queryPoints[0].coordinate).toEqual(point1.coordinate)
            expect(queryStore.state.queryPoints[1].coordinate).toEqual(point2.coordinate)
        })

        it('only skips invalid legacy point= entries, and re-emits the URL unchanged on roundtrip', async () => {
            const inputUrl = 'https://current.origin/?point=&point=11%2C12'
            window.location.href = inputUrl

            await navBar.updateStateFromUrl()

            expect(queryStore.state.queryPoints.length).toEqual(2)
            expect(queryStore.state.queryPoints[0].isInitialized).toEqual(false)
            expect(queryStore.state.queryPoints[0].queryText).toEqual('')
            expect(queryStore.state.queryPoints[1].coordinate).toEqual({ lat: 11, lng: 12 })
            expect(queryStore.state.queryPoints[1].isInitialized).toEqual(true)

            // parsing must not change the URL bar
            expect(window.location.href).toEqual(inputUrl)

            // re-emit and verify the URL is stable (profile + layer-short-code appended)
            await navBar.updateUrlFromState()
            expect(window.history.pushState).toHaveBeenLastCalledWith(null, '', inputUrl + '&profile=&l=osm')
        })

        it('invalidates old points when URL has none', async () => {
            window.location.href = 'https://origin.com'
            Dispatcher.dispatch(new SetPoint({ ...queryStore.state.queryPoints[0], isInitialized: true }, true))

            await navBar.updateStateFromUrl()

            expect(queryStore.state.queryPoints[0].isInitialized).toBeFalsy()
            expect(queryStore.state.queryPoints[1].isInitialized).toBeFalsy()
        })

        it('uses default layer when not provided', async () => {
            window.location.href = 'https://origin.com'

            await navBar.updateStateFromUrl()

            expect(queryStore.state.routingProfile.name).toEqual('')
            expect(mapStore.state.selectedStyle.name).toEqual(config.defaultTiles)
        })

        it('keeps the current routing profile when the URL has no profile param', async () => {
            const url = new URL(window.location.origin + window.location.pathname)
            url.searchParams.append('layer', 'Omniscale')
            window.location.href = url.toString()

            Dispatcher.dispatch(new SetVehicleProfile({ name: 'some-profile' }))
            const defaultProfile = queryStore.state.routingProfile

            await navBar.updateStateFromUrl()

            expect(queryStore.state.routingProfile.name).toEqual(defaultProfile.name)
            expect(mapStore.state.selectedStyle.name).toEqual('Omniscale')
        })

        it('parses the new short layer code (l=oms) and the legacy layer=<fullName> form', async () => {
            const urlShort = new URL(window.location.origin + window.location.pathname)
            urlShort.searchParams.append('l', 'oms')
            window.location.href = urlShort.toString()
            await navBar.updateStateFromUrl()
            expect(mapStore.state.selectedStyle.name).toEqual('Omniscale')

            const urlLegacy = new URL(window.location.origin + window.location.pathname)
            urlLegacy.searchParams.append('layer', 'Cyclosm')
            window.location.href = urlLegacy.toString()
            await navBar.updateStateFromUrl()
            expect(mapStore.state.selectedStyle.name).toEqual('Cyclosm')
        })

        it('supports the legacy "vehicle" param as profile', async () => {
            const url = new URL(window.location.origin + window.location.pathname)
            url.searchParams.append('layer', 'Omniscale')
            url.searchParams.append('vehicle', 'some-profile-name')
            window.location.href = url.toString()

            await navBar.updateStateFromUrl()

            expect(queryStore.state.routingProfile.name).toEqual('some-profile-name')
        })
    })

    it('does not let an older URL build overwrite a newer one when compressions complete out of order', async () => {
        // Two synchronous dispatches each kick off an async URL build. We force
        // the older build to finish *after* the newer one. Without the urlChangeId
        // guard the stale build's pushState would clobber the current URL.
        let resolveOld: (s: string) => void = () => {}
        let resolveNew: (s: string) => void = () => {}
        const spy = jest
            .spyOn(urlCompress, 'deflateB64url')
            .mockImplementationOnce(() => new Promise<string>(r => (resolveOld = r)))
            .mockImplementationOnce(() => new Promise<string>(r => (resolveNew = r)))

        try {
            queryStore.receive(new SetCustomModel('{"distance_influence":1}', true))
            queryStore.receive(new SetCustomModel('{"distance_influence":2}', true))

            // Resolve the newer build first, then the older one — the older one
            // returning last is exactly the race we're guarding against.
            resolveNew('NEW')
            await flush()
            resolveOld('OLD')
            await flush()

            expect(lastPushedUrl().searchParams.get('cmodel')).toEqual('NEW')
        } finally {
            spy.mockRestore()
        }
    })

    it('updates query store state on popstate (back-pressed)', async () => {
        const point: QueryPoint = {
            coordinate: { lat: 1, lng: 1 },
            id: 0,
            type: QueryPointType.To,
            isInitialized: false,
            queryText: '',
            color: '',
        }
        const url = new URL(window.location.origin + window.location.pathname)
        url.searchParams.append('point', coordinateToText(point.coordinate))
        url.searchParams.append('profile', 'some-profile')
        url.searchParams.append('layer', 'Omniscale')
        window.location.href = url.toString()

        await Promise.all(callbacks.map(callback => callback('popstate')))
        await flush()

        expect(queryStore.state.queryPoints[0].coordinate).toEqual(point.coordinate)
        expect(queryStore.state.queryPoints[0].isInitialized).toEqual(true)
        expect(queryStore.state.routingProfile.name).toEqual('some-profile')
        expect(mapStore.state.selectedStyle.name).toEqual('Omniscale')
    })
})
