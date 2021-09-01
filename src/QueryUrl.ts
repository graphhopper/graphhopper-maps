import { coordinateToText } from '@/Converters'
import { QueryPoint, QueryPointType, QueryStoreState } from '@/stores/QueryStore'
import Dispatcher from '@/stores/Dispatcher'
import { AddPoint, RemovePoint, SelectMapStyle, SetVehicleProfile } from '@/actions/Actions'
import { MapOptionsStoreState, StyleOption } from './stores/MapOptionsStore'

export function parseUrl(href: string, currentState: QueryStoreState, mapState: MapOptionsStoreState) {
    const url = new URL(href)
    parseRoutingProfile(url)
    parseLayer(url, mapState.styleOptions)
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
            return { lat: parseNumber(split[0]), lng: parseNumber(split[1]) }
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

function parseLayer(url: URL, options: StyleOption[]) {
    let layer = url.searchParams.get('layer')
    const option = options.find(option => option.name === layer)
    if (option) Dispatcher.dispatch(new SelectMapStyle(option))
}

function parseRoutingProfile(url: URL) {
    let profileKey = url.searchParams.get('profile')
    if (!profileKey) profileKey = 'car'
    Dispatcher.dispatch(
        new SetVehicleProfile({
            name: profileKey,
        })
    )
}

function parseNumber(value: string) {
    const number = Number.parseFloat(value)
    return Number.isNaN(number) ? 0 : number
}

export function createUrl(baseUrl: string, queryState: QueryStoreState, mapState: MapOptionsStoreState) {
    const result = new URL(baseUrl)
    queryState.queryPoints
        .filter(point => point.isInitialized)
        .map(point => coordinateToText(point.coordinate))
        .forEach(pointAsString => result.searchParams.append('point', pointAsString))

    result.searchParams.append('profile', queryState.routingProfile.name)
    result.searchParams.append('layer', mapState.selectedStyle.name)

    return result
}
