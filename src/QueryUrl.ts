import { coordinateToText } from '@/Converters'
import { QueryPoint, QueryPointType, QueryStoreState } from '@/stores/QueryStore'
import Dispatcher from '@/stores/Dispatcher'
import { AddPoint, RemovePoint, SetVehicle } from '@/actions/Actions'

export function parseUrl(href: string, currentState: QueryStoreState) {
    const url = new URL(href)
    parseRoutingVehicle(url)
    parsePoints(url, currentState.queryPoints)
}

function parsePoints(url: URL, queryPointsFromStore: QueryPoint[]) {
    const parsedPoints = url.searchParams
        .getAll('point')
        .map(parameter => {
            const split = parameter.split(',')
            if (split.length !== 2)
                throw Error(
                    'Could not parse url parameter point: ' + parameter + ' Think about what to do instead of crashing'
                )
            return { lat: parseNumber(split[0]), lng: parseNumber(split[1])}
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

    // add the point from the url to the store
    parsedPoints.forEach((point, i) => Dispatcher.dispatch(new AddPoint(i, point.coordinate, true)))

    // remove the points the store has as default but keep at least as many points as the default number of points in case the url didn't have any or too few points
    // Removing them after adding the others prevents premature routing requests
    for (let i = 0; i < queryPointsFromStore.length && i < parsedPoints.length; i++) {
        const point = queryPointsFromStore[i]
        Dispatcher.dispatch(new RemovePoint(point))
    }
}

function parseRoutingVehicle(url: URL) {
    const vehicleKey = url.searchParams.get('vehicle')
    if (vehicleKey) {
        Dispatcher.dispatch(
            new SetVehicle({
                key: vehicleKey,
                features: { elevation: false },
                version: '',
                import_date: '',
            })
        )
    }
}

function parseNumber(value: string) {
    const number = Number.parseFloat(value)
    return Number.isNaN(number) ? 0 : number
}

export function createUrl(baseUrl: string, state: QueryStoreState) {
    const result = new URL(baseUrl)
    state.queryPoints
        .filter(point => point.isInitialized)
        .map(point => coordinateToText(point.coordinate))
        .forEach(pointAsString => result.searchParams.append('point', pointAsString))

    result.searchParams.append('vehicle', state.routingVehicle.key)

    return result
}
