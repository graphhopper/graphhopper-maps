import { QueryPoint, QueryPointType } from '@/stores/QueryStore'

export function parseUrl(href: string): QueryPoint[] {
    const url = new URL(href)
    // so far we only have from and to coordinates. so this is the only thing we have to parse here
    return url.searchParams
        .getAll('point')
        .map(parameter => {
            const split = parameter.split(',')
            if (split.length !== 2)
                throw Error(
                    'Could not parse url parameter point: ' + parameter + ' Think about what to do instead of crashing'
                )
            return { lng: parseNumber(split[0]), lat: parseNumber(split[1]) }
        })
        .map(
            (coordinate, i): QueryPoint => {
                return {
                    coordinate: coordinate,
                    isInitialized: true,
                    id: i,
                    queryText: '',
                    color: '',
                    type: QueryPointType.Via,
                }
            }
        )
}

export function createUrl(baseUrl: string, points: QueryPoint[]) {
    const result = new URL(baseUrl)
    points
        .filter(point => point.isInitialized)
        .map(point => point.coordinate.lng + ',' + point.coordinate.lat)
        .forEach(pointAsString => result.searchParams.append('point', pointAsString))

    return result
}

function parseNumber(value: string) {
    const number = Number.parseFloat(value)
    return Number.isNaN(number) ? 0 : number
}
