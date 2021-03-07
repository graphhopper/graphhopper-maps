import { createUrl, parseUrl } from '../src/QueryUrl'
import { QueryPoint, QueryPointType } from '../src/stores/QueryStore'

describe('parseUrl', () => {
    it('should parse points from a url', () => {
        const point1 = [7.275303695325306, 50.67724646887518] as [number, number]
        const point2 = [10.81515858598078, 50.28050431501495] as [number, number]
        const url = `http://localhost:3000/?point=${point1.join(',')}&point=${point2.join(',')}`

        const points = parseUrl(url)

        expect(points.length).toEqual(2)
        expect(points[0]).toEqual(coordinateToQueryPoint(point1, 0))
        expect(points[1]).toEqual(coordinateToQueryPoint(point2, 1))
    })

    it('should create an empty request when no points are supplied', () => {
        const url = `http://localhost:3000/?`

        const points = parseUrl(url)

        expect(points.length).toEqual(0)
    })

    it('should ignore other params than points', () => {
        const point1 = [7.275303695325306, 50.67724646887518] as [number, number]
        const point2 = [10.81515858598078, 50.28050431501495] as [number, number]
        const url = `http://localhost:3000/?point=${point1.join(',')}&point=${point2.join(',')}&some-param=some-value`

        const points = parseUrl(url)

        expect(points.length).toEqual(2)
        expect(points[0]).toEqual(coordinateToQueryPoint(point1, 0))
        expect(points[1]).toEqual(coordinateToQueryPoint(point2, 1))
    })

    it('should raise an error if a point is not in the expected format', () => {
        const point1 = [7.275303695325306, 50.67724646887518, 1.0]
        const url = `http://localhost:3000/?point=${point1.join(',')}`

        expect(() => parseUrl(url)).toThrowError()
    })
})

describe('createUrl', () => {
    it('should convert points of a request into url params', () => {
        const point1 = [7.275303695325306, 50.67724646887518] as [number, number]
        const point2 = [10.81515858598078, 50.28050431501495] as [number, number]
        const expectedUrl = new URL('http://localhost:3000/')
        expectedUrl.searchParams.append('point', point1.join(','))
        expectedUrl.searchParams.append('point', point2.join(','))

        const result = createUrl(expectedUrl.origin, [
            coordinateToQueryPoint(point1, 1),
            coordinateToQueryPoint(point2, 2),
        ])

        expect(result).toEqual(expectedUrl)
    })
})

function coordinateToQueryPoint(coordinate: [number, number], id: number): QueryPoint {
    return {
        isInitialized: true,
        coordinate: { lng: coordinate[0], lat: coordinate[1] },
        queryText: '',
        id: id,
        color: '',
        type: QueryPointType.Via,
    }
}
