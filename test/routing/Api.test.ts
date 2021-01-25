import fetchMock from 'jest-fetch-mock'
import route, {RoutingArgs} from "../../src/routing/Api";

describe("fetching results from the graphhopper api", () => {

    // replace global 'fetch' method by fetchMock
    beforeAll(fetchMock.enableMocks)

    // clear everything before each test
    beforeEach(() => fetchMock.mockClear())

    // disable fetchMock and restore global 'fetch' method
    afterAll(() => fetchMock.disableMocks())

    it("should use POST as method as default", async () => {

        const args: RoutingArgs = {
            key: "", points: []
        }

        const expectedResponse = {all: 'good'}

        fetchMock.mockResponse(request => {
            expect(request.headers.get('method')).toEqual("POST")
            return Promise.resolve(JSON.stringify(expectedResponse))
        })

        const response = await route(args)

        expect(response).toEqual(expectedResponse)
    })

    it("should use GET as method if provided by args", async () => {

        // not properly testing GET here, since we actually want to use POST, but the
        // server is not yet configured for it.

        const args: RoutingArgs = {
            key: "", points: [], method: 'GET'
        }

        const expectedResponse = {paths: []}

        fetchMock.mockResponse(request => {
            expect(request.method).toEqual("GET")
            return Promise.resolve(JSON.stringify(expectedResponse))
        })

        const response = await route(args)

        expect(response).toEqual(expectedResponse)

    })

    it("should set default request parameters if none are provided", async () => {

        const args: RoutingArgs = {
            key: "", points: []
        }

        const expectedBody = {
            vehicle: "car",
            elevation: false,
            debug: false,
            instructions: true,
            locale: "en",
            optimize: false,
            points_encoded: true,
            points: args.points,
            key: args.key
        }

        const expectedResponse = {all: 'good'}

        fetchMock.mockResponse(request => {
            expect(request.headers.get('body')).toEqual(JSON.stringify(expectedBody))
            return Promise.resolve(JSON.stringify(expectedResponse))
        })

        const response = await route(args)
        expect(response).toEqual(expectedResponse)
    })

    it("should keep parameters if provided ", async () => {

        const args: RoutingArgs = {
            key: "",
            points: [],
            vehicle: "not-default",
            elevation: true,
            debug: true,
            instructions: false,
            locale: "not-en",
            optimize: true,
            points_encoded: false,
        }

        const expectedResponse = {all: 'good'}

        fetchMock.mockResponse(request => {
            const body = JSON.parse(request.headers.get('body') as string)
            expect(body).toEqual(args)
            return Promise.resolve(JSON.stringify(expectedResponse))
        })

        const response = await route(args)
        expect(response).toEqual(expectedResponse)
    })

    it("should use provided host and base path", async () => {

        const args: RoutingArgs = {
            basePath: "some-base-path",
            host: "http://some-host.com/",
            key: "some-key",
            points: [[0, 0], [1, 1]]
        }

        const expectedURL = new URL(args.host as string + args.basePath)
        expectedURL.searchParams.append("key", args.key)
        const expectedResult = {pahts: []}
        mockFetchWithExpectedURL(expectedURL, "application/json", expectedResult)

        const response = await route(args) as any
        expect(response).toEqual(expectedResult)
    })

    it("should use default host, default base path, and default data_type", async () => {

        const args: RoutingArgs = {
            key: "some-key",
            points: [[0, 0], [1, 1]]
        }

        const expectedURL = createDefaultURL(args.key)
        const expectedResult = {pahts: []}
        mockFetchWithExpectedURL(expectedURL, "application/json", expectedResult)

        const response = await route(args) as any
        expect(response).toEqual(expectedResult)

    })

    it("should use provided data type", async () => {
        const args: RoutingArgs = {
            key: "some-key",
            points: [[0, 0], [1, 1]],
            data_type: 'my-data-type'
        }

        const expectedResult = {pahts: []}
        mockFetchWithExpectedURL(createDefaultURL(args.key), args.data_type as string, expectedResult)

        const response = await route(args) as any
        expect(response).toEqual(expectedResult)
    })
})

function createDefaultURL(key: string) {
    const url = new URL("https://graphhopper.com/api/1" + "/route")
    url.searchParams.append("key", key)
    return url
}

function mockFetchWithExpectedURL(expectedURL: URL, data_type: string, response: any) {
    fetchMock.mockResponse(request => {
        expect(request.url).toEqual(expectedURL.toString())
        expect(request.headers.get('Accept')).toEqual(data_type)
        return Promise.resolve(JSON.stringify(response))
    })
}

