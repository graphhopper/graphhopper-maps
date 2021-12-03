import { Coordinate } from '@/stores/QueryStore'
import { findNextWayPoint } from '@/map/findNextWayPoint'

// test data, can be shown using these url parameters:
// ?point=52.550,13.352&point=52.547,13.358&point=52.541,13.368&point=52.542,13.376&point=52.542,13.383
// &point=52.545,13.391&point=52.542,13.408&point=52.539,13.424&point=52.533,13.441&point=52.527,13.447
// &point=52.533,13.476&point=52.561,13.457&point=52.581,13.397
const a = point(52.55, 13.352)
const x1 = point(52.547, 13.358)
const x2 = point(52.541, 13.368)
const x3 = point(52.542, 13.376)
const b = point(52.542, 13.383)
const x4 = point(52.545, 13.391)
const x5 = point(52.542, 13.408)
const c = point(52.539, 13.424)
const x6 = point(52.533, 13.441)
const x7 = point(52.527, 13.447)
const d = point(52.533, 13.476)
const x8 = point(52.561, 13.457)
const x9 = point(52.581, 13.397)

describe('findNextWayPoint', function () {
    it('should work', function () {
        const routes = [
            {
                coordinates: [a, x1, x2, x3, b, x4, x5, c, x6, x7, d],
                wayPoints: [a, b, c, d],
            },
        ]

        const clickLocations = [
            { point: point(52.567, 13.342), expectedIndex: 1 },
            { point: point(52.54, 13.378), expectedIndex: 1 },
            { point: point(52.542, 13.396), expectedIndex: 2 },
            { point: point(52.526, 13.463), expectedIndex: 3 },
            { point: point(52.526, 13.519), expectedIndex: 3 },
        ]

        for (let i = 0; i < clickLocations.length; ++i) {
            const result = findNextWayPoint(routes, clickLocations[i].point)
            expect(result.closestRoute).toEqual(0)
            expect(result.nextWayPoint).toEqual(clickLocations[i].expectedIndex)
        }
    })

    it('should work for multiple routes', function () {
        const routes = [
            {
                coordinates: [a, x9, d],
                wayPoints: [a, d],
            },
            {
                coordinates: [a, x3, d],
                wayPoints: [a, d],
            },
        ]
        {
            const result = findNextWayPoint(routes, point(52.53, 13.379))
            expect(result.closestRoute).toEqual(1)
            expect(result.nextWayPoint).toEqual(1)
        }
        {
            const result = findNextWayPoint(routes, point(52.577, 13.446))
            expect(result.closestRoute).toEqual(0)
            expect(result.nextWayPoint).toEqual(1)
        }
    })

    it('should work for round trips', function () {
        const routes = [
            {
                coordinates: [a, x1, x2, x3, b, x4, x5, c, x6, x7, d, x8, x9, a],
                wayPoints: [a, b, c, d, a],
            },
        ]

        const clickLocation = point(52.568, 13.389)
        expect(findNextWayPoint(routes, clickLocation).nextWayPoint).toEqual(4)
    })
})

function point(lat: number, lng: number): Coordinate {
    return { lat: lat, lng: lng }
}
