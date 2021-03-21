import { Action } from '@/stores/Dispatcher'
import { ApiInfo, Path, RoutingResult, RoutingVehicle } from '@/routing/Api'
import { Coordinate, QueryPoint } from '@/stores/QueryStore'

export class InfoReceived implements Action {
    readonly result: ApiInfo

    constructor(result: ApiInfo) {
        this.result = result
    }
}

export class SetPoint implements Action {
    readonly point: QueryPoint

    constructor(point: QueryPoint) {
        this.point = point
    }
}

export class SetVehicle implements Action {
    readonly vehicle: RoutingVehicle

    constructor(vehicle: RoutingVehicle) {
        this.vehicle = vehicle
    }
}

export class AddPoint implements Action {
    readonly atIndex: number
    readonly coordinate: Coordinate
    readonly isInitialized: boolean

    constructor(atIndex: number, coordinate: Coordinate, isInitialized: boolean) {
        this.atIndex = atIndex
        this.coordinate = coordinate
        this.isInitialized = isInitialized
    }
}

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
    readonly requestId: number

    constructor(result: RoutingResult, requestId: number) {
        this.result = result
        this.requestId = requestId
    }
}

export class ClearRoute implements Action {}

export class SetSelectedPath implements Action {
    readonly path: Path

    constructor(path: Path) {
        this.path = path
    }
}
