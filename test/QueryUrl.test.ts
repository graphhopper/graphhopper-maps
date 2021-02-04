import {createUrl, parseUrl} from "../src/QueryUrl";
import {ghKey} from "../src/routing/Api";

describe("parseUrl", () => {

    it("should parse points from a url", () => {

        const point1 = [7.275303695325306, 50.67724646887518]
        const point2 = [10.81515858598078, 50.28050431501495]
        const url = `http://localhost:3000/?point=${point1.join(',')}&point=${point2.join(',')}`

        const request = parseUrl(url)

        expect(request.points.length).toEqual(2)
        expect(request.points[0]).toEqual(point1)
        expect(request.points[1]).toEqual(point2)
    })

    it("should create an empty request when no points are supplied", () => {
        const url = `http://localhost:3000/?`

        const request = parseUrl(url)

        expect(request.points.length).toEqual(0)
    })

    it("should ignore other params than points", () => {

        const point1 = [7.275303695325306, 50.67724646887518]
        const point2 = [10.81515858598078, 50.28050431501495]
        const url = `http://localhost:3000/?point=${point1.join(',')}&point=${point2.join(',')}&some-param=some-value`

        const request = parseUrl(url)

        expect(request.points.length).toEqual(2)
        expect(request.points[0]).toEqual(point1)
        expect(request.points[1]).toEqual(point2)
    })

    it("should raise an error if a point is not in the expected format", () => {
        const point1 = [7.275303695325306, 50.67724646887518, 1.0]
        const url = `http://localhost:3000/?point=${point1.join(',')}`

        expect(() => parseUrl(url)).toThrowError()
    })
})

describe("createUrl", () => {

    it("should convert points of a request into url params", () => {

        const point1 = [7.275303695325306, 50.67724646887518] as [number, number]
        const point2 = [10.81515858598078, 50.28050431501495] as [number, number]
        const expectedUrl = new URL('http://localhost:3000/')
        expectedUrl.searchParams.append("point", point1.join(','))
        expectedUrl.searchParams.append("point", point2.join(','))

        const result = createUrl(expectedUrl.origin, {points: [point1, point2], key: ghKey})

        expect(result).toEqual(expectedUrl)
    })
})