import fetchMock from 'jest-fetch-mock'
import { ErrorAction, InfoReceived, RouteRequestFailed, RouteRequestSuccess } from '@/actions/Actions'
import { setTranslation } from '@/translation/Translation'

import Dispatcher from '@/stores/Dispatcher'
import { ApiImpl } from '@/api/Api'
import { ApiInfo, ErrorResponse, RoutingArgs, RoutingRequest } from '@/api/graphhopper'

beforeAll(() => {
    // replace global 'fetch' method by fetchMock
    fetchMock.enableMocks()
})

beforeEach(() => {
    fetchMock.mockClear()
    jest.clearAllMocks()
    // re-initialize translation before each test so that we can test translation setup
    setTranslation('en', true)
})

// disable fetchMock and restore global 'fetch' method
afterAll(() => fetchMock.disableMocks())

describe('info api', () => {
    it('should query correct url and dispatch an InfoReceived action', async () => {
        const ghApi = 'https://some.api/'
        const ghKey = 'some-key'
        const expectedUrl = ghApi + 'info?key=' + ghKey
        const expected: ApiInfo = {
            bbox: [0, 0, 0, 0],
            import_date: 'some_date1',
            profiles: [],
            elevation: false,
            version: 'some_version',
            encoded_values: [],
        }

        fetchMock.mockResponse(request => {
            // first assert, that the api is called correctly
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
                    encoded_values: expected.encoded_values,
                })
            )
        })

        const mockDispatcher = jest.spyOn(Dispatcher, 'dispatch')

        new ApiImpl(ghApi, ghKey).infoWithDispatch()
        await flushPromises()

        // second: assert that the request issues 1 info received action with the expected payload
        expect(mockDispatcher).toHaveBeenCalledTimes(1)
        expect(mockDispatcher).toHaveBeenCalledWith(new InfoReceived(expected))
    })

    it('should issue an error action if anything fails', async () => {
        const message = 'some error message'
        fetchMock.mockReject(new Error(message))
        const mockedDispatcher = jest.spyOn(Dispatcher, 'dispatch')

        new ApiImpl('https://some.api/', 'key').infoWithDispatch()
        await flushPromises()

        expect(mockedDispatcher).toHaveBeenCalledTimes(1)
        expect(mockedDispatcher).toHaveBeenCalledWith(new ErrorAction(message))
    })
})

describe('route', () => {
    it('should use correct metadata', async () => {
        const args: RoutingArgs = {
            points: [],
            maxAlternativeRoutes: 1,
            profile: 'profile',
            customModel: null,
        }
        const mockedDispatcher = jest.spyOn(Dispatcher, 'dispatch')
        const ghApi = 'https://some.api/'
        const ghKey = 'key'

        fetchMock.mockResponse(request => {
            expect(request.url.toString()).toEqual(ghApi + 'route?key=' + ghKey)
            expect(request.method).toEqual('POST')
            expect(request.headers.get('Accept')).toEqual('application/json')
            expect(request.headers.get('Content-Type')).toEqual('application/json')
            expect(request.body).toBeDefined()
            return Promise.resolve(JSON.stringify(getEmptyResult()))
        })

        new ApiImpl(ghApi, ghKey).routeWithDispatch(args)
        await flushPromises()

        expect(mockedDispatcher).toHaveBeenCalledTimes(1)
        expect(mockedDispatcher).toHaveBeenCalledWith(new RouteRequestSuccess(args, getEmptyResult()))
    })

    it('transforms routingArgs into routing request with default algorithm for maxAlternativeRoutes: 1', async () => {
        const args: RoutingArgs = {
            points: [],
            maxAlternativeRoutes: 1,
            profile: 'car',
            customModel: null,
        }

        const expectedBody: RoutingRequest = {
            points: args.points,
            profile: args.profile,
            elevation: true,
            debug: false,
            instructions: true,
            locale: 'en_US',
            optimize: 'false',
            points_encoded: true,
            snap_preventions: ['ferry'],
            details: ['road_class', 'road_environment', 'surface', 'max_speed', 'average_speed'],
        }

        const mockedDispatcher = jest.spyOn(Dispatcher, 'dispatch')

        fetchMock.mockResponse(async request => {
            return compareRequestBodyAndResolve(request, expectedBody)
        })

        new ApiImpl('https://some.api/', 'key').routeWithDispatch(args)
        await flushPromises()

        expect(mockedDispatcher).toHaveBeenCalledTimes(1)
        expect(mockedDispatcher).toHaveBeenCalledWith(new RouteRequestSuccess(args, getEmptyResult()))
    })

    it('transforms routingArgs into routing request with alternative_route algorithm for maxAlternativeRoutes > 1', async () => {
        const args: RoutingArgs = {
            points: [],
            maxAlternativeRoutes: 2,
            profile: 'car',
            customModel: null,
        }

        const expectedBody: RoutingRequest = {
            points: args.points,
            profile: args.profile,
            elevation: true,
            debug: false,
            instructions: true,
            locale: 'en_US',
            optimize: 'false',
            points_encoded: true,
            snap_preventions: ['ferry'],
            details: ['road_class', 'road_environment', 'surface', 'max_speed', 'average_speed'],
            'alternative_route.max_paths': args.maxAlternativeRoutes,
            algorithm: 'alternative_route',
        }

        const mockedDispatcher = jest.spyOn(Dispatcher, 'dispatch')

        fetchMock.mockResponse(async request => {
            return compareRequestBodyAndResolve(request, expectedBody)
        })

        new ApiImpl('https://some.api/', 'key').routeWithDispatch(args)
        await flushPromises()

        expect(mockedDispatcher).toHaveBeenCalledTimes(1)
        expect(mockedDispatcher).toHaveBeenCalledWith(new RouteRequestSuccess(args, getEmptyResult()))
    })

    it('transforms routingArgs into routing request with custom model', async () => {
        const args: RoutingArgs = {
            points: [],
            maxAlternativeRoutes: 1,
            profile: 'car',
            customModel: {
                speed: [
                    {
                        if: 'road_class == MOTORWAY',
                        multiply_by: 0.8,
                    },
                ],
            },
        }

        const expectedBody: RoutingRequest = {
            points: args.points,
            profile: args.profile,
            elevation: true,
            debug: false,
            instructions: true,
            locale: 'en_US',
            optimize: 'false',
            points_encoded: true,
            snap_preventions: ['ferry'],
            details: ['road_class', 'road_environment', 'surface', 'max_speed', 'average_speed'],
            custom_model: args.customModel!,
            'ch.disable': true,
        }

        const mockedDispatcher = jest.spyOn(Dispatcher, 'dispatch')

        fetchMock.mockResponse(async request => {
            return compareRequestBodyAndResolve(request, expectedBody)
        })

        new ApiImpl('https://some.api/', 'key').routeWithDispatch(args)
        await flushPromises()

        expect(mockedDispatcher).toHaveBeenCalledTimes(1)
        expect(mockedDispatcher).toHaveBeenCalledWith(new RouteRequestSuccess(args, getEmptyResult()))
    })

    // i guess this is implicitly tested above, but it is nice to write it down like this.
    it('should create an action when a response is received', async () => {
        const args: RoutingArgs = {
            points: [
                [0, 0],
                [1, 1],
            ],
            maxAlternativeRoutes: 1,
            profile: 'bla',
            customModel: null,
        }

        fetchMock.mockResponseOnce(JSON.stringify(getEmptyResult()))
        const mockedDispatcher = jest.spyOn(Dispatcher, 'dispatch')

        new ApiImpl('https://some.api/', 'key').routeWithDispatch(args)
        await flushPromises()

        expect(mockedDispatcher).toHaveBeenCalledTimes(1)
        expect(mockedDispatcher).toHaveBeenCalledWith(new RouteRequestSuccess(args, getEmptyResult()))
    })

    it('should create an action when an error is received', async () => {
        const args: RoutingArgs = {
            points: [
                [0, 0],
                [1, 1],
            ],
            maxAlternativeRoutes: 1,
            profile: 'bla',
            customModel: null,
        }

        const error: ErrorResponse = {
            message: 'trigger error message from test',
            hints: [],
        }

        fetchMock.mockRejectOnce(() => Promise.resolve(new Response(JSON.stringify(error), { status: 400 })))
        const mockedDispatcher = jest.spyOn(Dispatcher, 'dispatch')

        new ApiImpl('https://some.api/', 'key').routeWithDispatch(args)
        await flushPromises()

        expect(mockedDispatcher).toHaveBeenCalledTimes(1)
        expect(mockedDispatcher).toHaveBeenCalledWith(new RouteRequestFailed(args, error.message))
    })

    it('should handle 500 error', async () => {
        const args: RoutingArgs = {
            profile: 'car',
            points: [],
            maxAlternativeRoutes: 3,
            customModel: null,
        }
        fetchMock.mockResponse(() => Promise.resolve({ status: 500 }))
        await expect(new ApiImpl('https://some.api/', 'key').route(args)).rejects.toThrow('Route calculation timed out')
    })

    it('correct de locale', async () => {
        // overwrite setTranslation call in initialization
        setTranslation('de', true)
        const args: RoutingArgs = {
            points: [],
            maxAlternativeRoutes: 1,
            profile: 'car',
            customModel: null,
        }

        const expectedBody: RoutingRequest = {
            points: args.points,
            profile: args.profile,
            elevation: true,
            debug: false,
            instructions: true,
            locale: 'de_DE',
            optimize: 'false',
            points_encoded: true,
            snap_preventions: ['ferry'],
            details: ['road_class', 'road_environment', 'surface', 'max_speed', 'average_speed'],
        }

        const mockedDispatcher = jest.spyOn(Dispatcher, 'dispatch')

        fetchMock.mockResponse(async request => {
            return compareRequestBodyAndResolve(request, expectedBody)
        })

        new ApiImpl('https://some.api/', 'key').routeWithDispatch(args)
        await flushPromises()

        expect(mockedDispatcher).toHaveBeenCalledTimes(1)
        expect(mockedDispatcher).toHaveBeenCalledWith(new RouteRequestSuccess(args, getEmptyResult()))
    })
})

function getEmptyResult() {
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

async function flushPromises() {
    const flush = () => new Promise(setImmediate)
    await flush()
}
