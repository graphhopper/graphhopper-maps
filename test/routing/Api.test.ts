import fetchMock from 'jest-fetch-mock'
import Dispatcher, { Action } from '../../src/stores/Dispatcher'
import { InfoReceived, RouteRequestFailed, RouteRequestSuccess } from '../../src/actions/Actions'
import Api, { ghKey } from '../../src/api/Api'
import { ApiInfo, ErrorResponse, RawResult, RoutingArgs, RoutingRequest } from '../../src/api/graphhopper'

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

        await new Api().infoWithDispatch()
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

        await new Api().infoWithDispatch()
    })
})

describe('route', () => {
    it('should use correct metadata', async () => {
        const args: RoutingArgs = {
            points: [],
            maxAlternativeRoutes: 1,
            vehicle: 'vehicle',
        }

        fetchMock.mockResponse(request => {
            expect(request.url.toString()).toEqual('https://graphhopper.com/api/1/route?key=' + ghKey)
            expect(request.method).toEqual('POST')
            //expect(request.mode).toEqual('cors') This could be tested as well but somehow this is not set in fetch mock request :-(
            expect(request.headers.get('Accept')).toEqual('application/json')
            expect(request.headers.get('Content-Type')).toEqual('application/json')
            expect(request.body).toBeDefined()
            return Promise.resolve(JSON.stringify(getEmptyResult()))
        })

        await new Api().routeWithDispatch(args)
    })

    it('transforms routingArgs into routing request with default algorithm for maxAlternativeRoutes: 1', async () => {
        const args: RoutingArgs = {
            points: [],
            maxAlternativeRoutes: 1,
            vehicle: 'car',
        }

        const expectedBody: RoutingRequest = {
            points: args.points,
            vehicle: args.vehicle,
            elevation: false,
            debug: false,
            instructions: true,
            locale: 'en',
            optimize: 'false',
            points_encoded: true,
        }

        fetchMock.mockResponse(async request => {
            return compareRequestBodyAndResolve(request, expectedBody)
        })

        await new Api().routeWithDispatch(args)
    })

    it('transforms routingArgs into routing request with alternative_route algorithm for maxAlternativeRoutes > 1', async () => {
        const args: RoutingArgs = {
            points: [],
            maxAlternativeRoutes: 2,
            vehicle: 'car',
        }

        const expectedBody: RoutingRequest = {
            points: args.points,
            vehicle: args.vehicle,
            elevation: false,
            debug: false,
            instructions: true,
            locale: 'en',
            optimize: 'false',
            points_encoded: true,
            'alternative_route.max_paths': args.maxAlternativeRoutes,
            algorithm: 'alternative_route',
        }

        fetchMock.mockResponse(async request => {
            return compareRequestBodyAndResolve(request, expectedBody)
        })

        await new Api().routeWithDispatch(args)
    })

    it('should create an action when a response is received', async () => {
        const args: RoutingArgs = {
            points: [
                [0, 0],
                [1, 1],
            ],
            maxAlternativeRoutes: 1,
            vehicle: 'bla',
        }

        fetchMock.mockResponseOnce(JSON.stringify(getEmptyResult()))

        Dispatcher.register({
            receive(action: Action) {
                expect(action instanceof RouteRequestSuccess).toBeTruthy()
                expect((action as RouteRequestSuccess).result.paths.length).toEqual(0)
                expect((action as RouteRequestSuccess).request).toEqual(args)
            },
        })

        await new Api().routeWithDispatch(args)
    })

    it('should create an action when an error is received', async () => {
        const args: RoutingArgs = {
            points: [
                [0, 0],
                [1, 1],
            ],
            maxAlternativeRoutes: 1,
            vehicle: 'bla',
        }

        const error: ErrorResponse = {
            message: 'message',
            hints: {},
        }

        fetchMock.mockRejectOnce(() => Promise.resolve(new Response(JSON.stringify(error), { status: 400 })))

        Dispatcher.register({
            receive(action: Action) {
                expect(action instanceof RouteRequestFailed).toBeTruthy()
                expect((action as RouteRequestFailed).errorMessage).toEqual(error.message)
                expect((action as RouteRequestFailed).request).toEqual(args)
            },
        })

        await new Api().routeWithDispatch(args)
    })
})

function getEmptyResult(): RawResult {
    return {
        info: { copyright: [], took: 0 },
        paths: [],
    }
}

async function compareRequestBodyAndResolve(request: Request, expectedBody: any) {
    const bodyAsResponse = new Response(request.body)
    const bodyContent = await bodyAsResponse.text()
    expect(bodyContent).toEqual(JSON.stringify(expectedBody))
    return Promise.resolve(JSON.stringify(getEmptyResult()))
}
