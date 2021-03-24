import fetchMock from 'jest-fetch-mock'
import routeWithoutAlternativeRoutes, {
    ApiInfo,
    ghKey,
    info,
    RawResult,
    routeWithAlternativeRoutes,
    RoutingArgs,
} from '@/routing/Api'
import Dispatcher, { Action } from '../../src/stores/Dispatcher'
import { InfoReceived, RouteReceived } from '../../src/actions/Actions'

// replace global 'fetch' method by fetchMock
beforeAll(fetchMock.enableMocks)

// clear everything before each test
beforeEach(() => fetchMock.mockClear())

// after each test clear the dispatcher in case a dummy store was registered
afterEach(() => Dispatcher.clear())

// disable fetchMock and restore global 'fetch' method
afterAll(() => fetchMock.disableMocks())

it('should pass', () => {})

describe('info api', () => {
    it('should query correct url and dispatch an InfoReceived action', async () => {
        const expectedUrl = 'https://graphhopper.com/api/1/info?key=' + ghKey
        const expected: ApiInfo = {
            bbox: [0, 0, 0, 0],
            import_date: 'some_date',
            vehicles: [],
            version: 'some_version',
        }

        fetchMock.mockResponse(request => {
            expect(request.method).toEqual('GET')
            expect(request.url.toString()).toEqual(expectedUrl)
            expect(request.headers.get('Accept')).toEqual('application/json')
            return Promise.resolve(
                JSON.stringify({
                    bbox: expected.bbox,
                    import_date: expected.import_date,
                    version: expected.version,
                    features: {},
                })
            )
        })

        Dispatcher.register({
            receive(action: Action) {
                expect(action instanceof InfoReceived).toBeTruthy()
                expect((action as InfoReceived).result).toEqual(expected)
            },
        })

        await info()
    })

    it('should convert the response into an ApiInfo object', async () => {
        const carRoutingVehicle = {
            key: 'car',
            version: '1_car',
            import_date: 'car_import_date',
            features: { elevation: true },
        }
        const expected: ApiInfo = {
            bbox: [0, 0, 0, 0],
            import_date: 'some_date',
            vehicles: [carRoutingVehicle],
            version: 'some_version',
        }

        fetchMock.mockResponseOnce(
            JSON.stringify({
                bbox: expected.bbox,
                import_date: expected.import_date,
                version: expected.version,
                car: { version: carRoutingVehicle.version, import_date: carRoutingVehicle.import_date },
                notAVehicle: { version: 'notAVehicle_version', import_date: 'notAVehicle_import_date' },
                features: { car: { elevation: true } },
            })
        )

        Dispatcher.register({
            receive(action: Action) {
                expect(action instanceof InfoReceived).toBeTruthy()
                expect((action as InfoReceived).result).toEqual(expected)
            },
        })

        await info()
    })
})

describe('route without alternatives', () => {
    it('should use POST as method as default', async () => {
        const args: RoutingArgs = {
            points: [],
        }

        fetchMock.mockResponse(request => {
            expect(request.method).toEqual('POST')
            return Promise.resolve(JSON.stringify(getEmptyResult()))
        })

        await routeWithoutAlternativeRoutes(1, args)
    })

    it('should set default request parameters if none are provided', async () => {
        const args: RoutingArgs = {
            points: [],
        }

        const expectedBody = {
            vehicle: 'car',
            elevation: false,
            debug: false,
            instructions: true,
            locale: 'en',
            optimize: 'false',
            points_encoded: true,
            points: args.points,
        }

        fetchMock.mockResponse(async request => {
            const bodyAsResponse = new Response(request.body)
            const bodyContent = await bodyAsResponse.text()
            expect(bodyContent).toEqual(JSON.stringify(expectedBody))
            return Promise.resolve(JSON.stringify(getEmptyResult()))
        })

        await routeWithoutAlternativeRoutes(0, args)
    })

    it('should keep parameters if provided ', async () => {
        const args: RoutingArgs = {
            points: [],
            vehicle: 'not-default',
        }

        const expectedBody = {
            vehicle: args.vehicle,
            elevation: false,
            debug: false,
            instructions: true,
            locale: 'en',
            optimize: 'false',
            points_encoded: true,
            points: args.points,
        }

        fetchMock.mockResponse(async request => {
            const bodyAsResponse = new Response(request.body)
            const bodyContent = await bodyAsResponse.json()
            expect(bodyContent).toEqual(expectedBody)
            return Promise.resolve(JSON.stringify(getEmptyResult()))
        })

        await routeWithoutAlternativeRoutes(0, args)
    })

    it('should create an action when a response is received', async () => {
        const args: RoutingArgs = {
            points: [
                [0, 0],
                [1, 1],
            ],
        }
        const requestId = 1

        fetchMock.mockResponseOnce(JSON.stringify(getEmptyResult()))

        Dispatcher.register({
            receive(action: Action) {
                expect(action instanceof RouteReceived).toBeTruthy()
                expect((action as RouteReceived).result.paths.length).toEqual(0)
                expect((action as RouteReceived).requestId).toEqual(requestId)
            },
        })

        await routeWithoutAlternativeRoutes(requestId, args)
    })
})

describe('route with alternatives', () => {
    it('should work like without alternatives but with different params', async () => {
        const args: RoutingArgs = {
            points: [],
        }

        const expectedBody = {
            vehicle: 'car',
            elevation: false,
            debug: false,
            instructions: true,
            locale: 'en',
            optimize: 'false',
            points_encoded: true,
            'alternative_route.max_paths': 3,
            algorithm: 'alternative_route',
            points: args.points,
        }

        fetchMock.mockResponse(async request => {
            const bodyAsResponse = new Response(request.body)
            const bodyContent = await bodyAsResponse.text()
            expect(bodyContent).toEqual(JSON.stringify(expectedBody))
            return Promise.resolve(JSON.stringify(getEmptyResult()))
        })

        await routeWithAlternativeRoutes(0, args)
    })
})

function getEmptyResult(): RawResult {
    return {
        info: { copyright: [], took: 0 },
        paths: [],
    }
}
