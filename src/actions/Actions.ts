import { Action } from '@/stores/Dispatcher'
import { InfoResult, RoutingResult } from '@/routing/Api'
import { Coordinate, QueryPoint } from '@/stores/QueryStore'

export class InfoReceived implements Action {
    readonly result: InfoResult

    constructor(result: InfoResult) {
        this.result = result
    }
}

export class SetPoint implements Action {
    readonly id: number
    readonly coordinate: Coordinate
    readonly text: string

    constructor(id: number, coordinate: Coordinate, text: string) {
        this.id = id
        this.coordinate = coordinate
        this.text = text
    }
}

export class AddPoint implements Action {}

export class ClearPoints implements Action {}

export class RemovePoint implements Action {
    readonly point: QueryPoint

    constructor(point: QueryPoint) {
        this.point = point
    }
}

export class InvalidatePoint implements Action {
    readonly point: QueryPoint

    constructor(point: QueryPoint) {
        this.point = point
    }
}

export class RouteReceived implements Action {
    readonly result: RoutingResult

    constructor(result: RoutingResult) {
        this.result = result
    }
}

export class ClearRoute implements Action {}
