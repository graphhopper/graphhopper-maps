import fetchMock from 'jest-fetch-mock'
import Dispatcher, { Action } from '../../src/stores/Dispatcher'
import { ErrorAction, InfoReceived, RouteRequestFailed, RouteRequestSuccess } from '../../src/actions/Actions'
import { ApiImpl, ghKey } from '../../src/api/Api'
import { ApiInfo, ErrorResponse, RawResult, RoutingArgs, RoutingRequest } from '../../src/api/graphhopper'

// replace global 'fetch' method by fetchMock
beforeAll(fetchMock.enableMocks)

// clear everything before each test
beforeEach(() => fetchMock.mockClear())

// after each test clear the dispatcher in case a dummy store was registered
afterEach(() => Dispatcher.clear())

// disable fetchMock and restore global 'fetch' method
afterAll(() => fetchMock.disableMocks())

describe('info api', () => {
    it('should query correct url and dispatch an InfoReceived action', async () => {
        const expectedUrl = 'https://graphhopper.com/api/1/info?key=' + ghKey
        const expected: ApiInfo = {
            bbox: [0, 0, 0, 0],
            import_date: 'some_date1',
            profiles: [],
            elevation: false,
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
                    profiles: [],
                    elevation: expected.elevation,
                })
            )
        })

        // this is a little indirect. we are making assertions in the callback of the async api call
        // if the assertion is wrong the error is caught by the error handler of the api, dispatching an errorAction
        // therefore we must make the test fail manually
        Dispatcher.register({
            receive(action: Action) {
                if (action instanceof InfoReceived) {
                    expect(action.result).toEqual(expected)
                } else if (action instanceof ErrorAction) {
                    fail(action.message)
                } else {
                    fail('unexpected action')
                }
            },
        })

        // also, this call needs to be awaited so that the above fail within the receive method can fail the test.
        await new ApiImpl().infoWithDispatch()
    })

    it('should convert the response into an ApiInfo object', async () => {
        const expected: ApiInfo = {
            bbox: [0, 0, 0, 0],
            elevation: true,
            import_date: 'some_date2',
            profiles: [{ name: 'car' }],
            version: 'some_version',
        }

        fetchMock.mockResponseOnce(
            JSON.stringify({
                bbox: expected.bbox,
                import_date: expected.import_date,
                version: expected.version,
                profiles: expected.profiles,
                notAVehicle: { version: 'notAVehicle_version', import_date: 'notAVehicle_import_date' },
                elevation: expected.elevation,
            })
        )

        Dispatcher.register({
            receive(action: Action) {
                if (action instanceof InfoReceived) {
                    expect(action.result).toEqual(expected)
                } else if (action instanceof ErrorAction) {
                    fail(action.message)
                } else {
                    fail('unexpected action')
                }
            },
        })

        await new ApiImpl().infoWithDispatch()
    })
})

describe('route', () => {
    it('should use correct metadata', async () => {
        const args: RoutingArgs = {
            points: [],
            maxAlternativeRoutes: 1,
            profile: 'profile',
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

        await new ApiImpl().routeWithDispatch(args)
    })

    it('transforms routingArgs into routing request with default algorithm for maxAlternativeRoutes: 1', async () => {
        const args: RoutingArgs = {
            points: [],
            maxAlternativeRoutes: 1,
            profile: 'car',
        }

        const expectedBody: RoutingRequest = {
            points: args.points,
            profile: args.profile,
            elevation: true,
            debug: false,
            instructions: true,
            locale: 'en',
            optimize: 'false',
            points_encoded: true,
            details: ['road_class', 'road_environment', 'surface', 'max_speed', 'average_speed'],
        }

        fetchMock.mockResponse(async request => {
            return compareRequestBodyAndResolve(request, expectedBody)
        })

        await new ApiImpl().routeWithDispatch(args)
    })

    it('transforms routingArgs into routing request with alternative_route algorithm for maxAlternativeRoutes > 1', async () => {
        const args: RoutingArgs = {
            points: [],
            maxAlternativeRoutes: 2,
            profile: 'car',
        }

        const expectedBody: RoutingRequest = {
            points: args.points,
            profile: args.profile,
            elevation: true,
            debug: false,
            instructions: false,
            locale: 'en',
            optimize: 'false',
            points_encoded: true,
            'alternative_route.max_paths': args.maxAlternativeRoutes,
            algorithm: 'alternative_route',
            details: ['road_class', 'road_environment', 'surface', 'max_speed', 'average_speed'],
        }

        fetchMock.mockResponse(async request => {
            return compareRequestBodyAndResolve(request, expectedBody)
        })

        await new ApiImpl().routeWithDispatch(args)
    })

    it('should create an action when a response is received', async () => {
        const args: RoutingArgs = {
            points: [
                [0, 0],
                [1, 1],
            ],
            maxAlternativeRoutes: 1,
            profile: 'bla',
        }

        fetchMock.mockResponseOnce(JSON.stringify(getEmptyResult()))

        Dispatcher.register({
            receive(action: Action) {
                expect(action instanceof RouteRequestSuccess).toBeTruthy()
                expect((action as RouteRequestSuccess).result.paths.length).toEqual(0)
                expect((action as RouteRequestSuccess).request).toEqual(args)
            },
        })

        await new ApiImpl().routeWithDispatch(args)
    })

    it('should create an action when an error is received', async () => {
        const args: RoutingArgs = {
            points: [
                [0, 0],
                [1, 1],
            ],
            maxAlternativeRoutes: 1,
            profile: 'bla',
        }

        const error: ErrorResponse = {
            message: 'message',
            hints: [],
        }

        fetchMock.mockRejectOnce(() => Promise.resolve(new Response(JSON.stringify(error), { status: 400 })))

        Dispatcher.register({
            receive(action: Action) {
                expect(action instanceof RouteRequestFailed).toBeTruthy()
                expect((action as RouteRequestFailed).message).toEqual(error.message)
                expect((action as RouteRequestFailed).request).toEqual(args)
            },
        })

        await new ApiImpl().routeWithDispatch(args)
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
