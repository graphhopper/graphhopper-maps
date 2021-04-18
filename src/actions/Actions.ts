import { Action } from '@/stores/Dispatcher'
import { Coordinate, QueryPoint } from '@/stores/QueryStore'
import { ApiInfo, Path, RoutingArgs, RoutingResult, RoutingVehicle } from '@/api/graphhopper'
import { StyleOption } from '@/stores/MapOptionsStore'

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

export class SpeakText implements Action {
    readonly text: string
    constructor(text: string) {
        this.text = text
    }
}

export class SetCurrentLocation implements Action {
    readonly coordinate: Coordinate
    readonly heading: number
    readonly speed: number

    constructor(coordinate: Coordinate, heading: number, speed: number) {
        this.coordinate = coordinate
        this.heading = heading
        this.speed = speed
    }
}

export class LocationUpdate implements Action {
    readonly coordinate: Coordinate

    constructor(coordinate: Coordinate) {
        this.coordinate = coordinate
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

export class RouteRequestSuccess implements Action {
    readonly result: RoutingResult
    readonly request: RoutingArgs

    constructor(request: RoutingArgs, result: RoutingResult) {
        this.result = result
        this.request = request
    }
}

export class RouteRequestFailed implements Action {
    readonly errorMessage: string
    readonly request: RoutingArgs

    constructor(request: RoutingArgs, errorMessage: string) {
        this.errorMessage = errorMessage
        this.request = request
    }
}

export class ClearRoute implements Action {}

export class SetSelectedPath implements Action {
    readonly path: Path

    constructor(path: Path) {
        this.path = path
    }
}

export class DismissLastError implements Action {}

export class SelectMapStyle implements Action {
    readonly styleOption: StyleOption

    constructor(styleOption: StyleOption) {
        this.styleOption = styleOption
    }
}

export class MapIsLoaded implements Action {}
