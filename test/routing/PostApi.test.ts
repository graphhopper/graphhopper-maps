import fetchMock, {enableFetchMocks} from "jest-fetch-mock";
import route from "../../src/routing/PostApi";

enableFetchMocks()


beforeEach(() => fetchMock.resetMocks())

it("do request", async () => {

    fetchMock.mockResponse(JSON.stringify({paths: []}))


    const result = await route({
        key: "some-api-key",
        points: [[1, 1], [2, 2]]
    })

    expect(result.paths.length).toEqual(0)
})

