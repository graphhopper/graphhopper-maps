import { Action } from '@/stores/Dispatcher'
import { Coordinate, CustomModel, QueryPoint } from '@/stores/QueryStore'
import { ApiInfo, Bbox, Path, RoutingArgs, RoutingProfile, RoutingResult } from '@/api/graphhopper'
import { PathDetailsPoint } from '@/stores/PathDetailsStore'

export class InfoReceived implements Action {
    readonly result: ApiInfo

    constructor(result: ApiInfo) {
        this.result = result
    }
}

export class SetPoint implements Action {
    readonly point: QueryPoint
    readonly zoom: boolean

    constructor(point: QueryPoint, zoom: boolean) {
        this.point = point
        this.zoom = zoom
    }
}

export class SetVehicleProfile implements Action {
    readonly profile: RoutingProfile

    constructor(profile: RoutingProfile) {
        this.profile = profile
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

export class SetQueryPoints implements Action {
    readonly queryPoints: QueryPoint[]

    constructor(queryPoints: QueryPoint[]) {
        this.queryPoints = queryPoints
    }
}

export class ClearPoints implements Action {}

export class RemovePoint implements Action {
    readonly point: QueryPoint

    constructor(point: QueryPoint) {
        this.point = point
    }
}

export class MovePoint implements Action {
    readonly point: QueryPoint
    readonly newIndex: number

    constructor(point: QueryPoint, newIndex: number) {
        this.point = point
        this.newIndex = newIndex
    }
}

export class InvalidatePoint implements Action {
    readonly point: QueryPoint

    constructor(point: QueryPoint) {
        this.point = point
    }
}

export class SetCustomModelEnabled implements Action {
    readonly enabled: boolean

    constructor(enabled: boolean) {
        this.enabled = enabled
    }
}

export class SetCustomModel implements Action {
    readonly customModelStr: string
    readonly issueRoutingRequest: boolean

    constructor(customModelStr: string, issueRoutingRequest: boolean) {
        this.customModelStr = customModelStr
        this.issueRoutingRequest = issueRoutingRequest
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

export class ErrorAction implements Action {
    readonly message: string

    constructor(message: string) {
        this.message = message
    }
}

export class RouteRequestFailed extends ErrorAction {
    readonly request: RoutingArgs

    constructor(request: RoutingArgs, message: string) {
        super(message)
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

export class SelectMapLayer implements Action {
    readonly layer: string

    constructor(layer: string) {
        this.layer = layer
    }
}

export class ToggleRoutingGraph implements Action {
    readonly routingGraphEnabled: boolean

    constructor(routingGraphEnabled: boolean) {
        this.routingGraphEnabled = routingGraphEnabled
    }
}

export class ToggleUrbanDensityLayer implements Action {
    readonly urbanDensityEnabled: boolean

    constructor(urbanDensityEnabled: boolean) {
        this.urbanDensityEnabled = urbanDensityEnabled
    }
}

export class MapIsLoaded implements Action {}

export class ZoomMapToPoint implements Action {
    readonly coordinate: Coordinate
    readonly zoom: number

    constructor(coordinate: Coordinate, zoom: number) {
        this.coordinate = coordinate
        this.zoom = zoom
    }
}

export class SetInitialBBox implements Action {
    readonly bbox: Bbox

    constructor(bbox: Bbox) {
        this.bbox = bbox
    }
}

export class PathDetailsHover implements Action {
    readonly pathDetailsPoint: PathDetailsPoint | null

    constructor(pathDetailsPoint: PathDetailsPoint | null) {
        this.pathDetailsPoint = pathDetailsPoint
    }
}

export class PathDetailsRangeSelected implements Action {
    readonly bbox: Bbox | null

    constructor(bbox: Bbox | null) {
        this.bbox = bbox
    }
}

export class PathDetailsElevationSelected implements Action {
    readonly segments: Coordinate[][]

    constructor(segments: Coordinate[][]) {
        this.segments = segments
    }
}

export class RoutingGraphHover implements Action {
    readonly point: Coordinate | null
    readonly properties: object

    constructor(point: Coordinate | null, properties: object) {
        this.point = point
        this.properties = properties
    }
}

export class InstructionClicked implements Action {
    readonly coordinate: Coordinate | null
    readonly text: string

    constructor(point: Coordinate | null, text: string) {
        this.coordinate = point
        this.text = text
    }
}

export class ToggleDistanceUnits implements Action {}
