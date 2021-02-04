import {ghKey, RoutingArgs} from "@/routing/Api";

export function parseUrl(href: string): RoutingArgs {

    const url = new URL(href)
    // so far we only have from and to coordinates. so this is the only thing we have to parse here
    const points = url.searchParams.getAll('point')
        .map(parameter => {
            const split = parameter.split(',')
            if (split.length !== 2) throw Error("Could not parse url parameter point: " + parameter + " Think about what to do instead of crashing")
            return split
                .map(value => {
                    const number = Number.parseFloat(value)
                    return Number.isNaN(number) ? 0 : number
                }) as [number, number]
        })

    return {
        points: points,
        key: ghKey
    }
}

export function createUrl(baseUrl: string, request: RoutingArgs) {

    const result = new URL(baseUrl)
    request.points
        .map(point => point.join(','))
        .forEach(pointAsString => result.searchParams.append("point", pointAsString))

      return result
}