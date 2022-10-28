import { Action } from '@/stores/Dispatcher'
import { Coordinate, CustomModel, QueryPoint } from '@/stores/QueryStore'
import { ApiInfo, Bbox, Path, RoutingArgs, RoutingProfile, RoutingResult } from '@/api/graphhopper'
import { StyleOption } from '@/stores/MapOptionsStore'
import { PathDetailsPoint } from '@/stores/PathDetailsStore'
import { TNSettingsState } from '@/stores/TurnNavigationStore'

export class InfoReceived implements Action {
    readonly result: ApiInfo

    constructor(result: ApiInfo) {
        this.result = result
    }
}

export class TurnNavigationStop implements Action {}

export class LocationUpdate implements Action {
    readonly coordinate: Coordinate
    readonly speed: number
    readonly heading: number

    constructor(coordinate: Coordinate, speed: number, heading: number) {
        this.coordinate = coordinate
        this.speed = speed
        this.heading = heading
    }
}

export class TurnNavigationSettingsUpdate implements Action {
    readonly settings: TNSettingsState

    constructor(settings: TNSettingsState) {
        this.settings = settings
    }
}

export class TurnNavigationReroutingFailed implements Action {}

export class TurnNavigationRerouting implements Action {
    readonly path: Path

    constructor(path: Path) {
        this.path = path
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

export class SetRoutingParametersAtOnce implements Action {
    readonly queryPoints: QueryPoint[]
    readonly routingProfile: RoutingProfile

    constructor(queryPoints: QueryPoint[], routingProfile: RoutingProfile) {
        this.queryPoints = queryPoints
        this.routingProfile = routingProfile
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

export class SetCustomModelBoxEnabled implements Action {
    readonly enabled: boolean

    constructor(enabled: boolean) {
        this.enabled = enabled
    }
}

export class SetCustomModel implements Action {
    readonly customModel: CustomModel | null
    readonly valid: boolean
    readonly issueRouteRequest

    constructor(customModel: CustomModel | null, valid: boolean, issueRouteRequest = false) {
        this.customModel = customModel
        this.valid = valid
        this.issueRouteRequest = issueRouteRequest
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

export class SelectMapStyle implements Action {
    readonly styleOption: StyleOption

    constructor(styleOption: StyleOption) {
        this.styleOption = styleOption
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
    readonly pitch: number
    // in degrees
    readonly heading?: number
    readonly navigationOffset: boolean

    constructor(coordinate: Coordinate, zoom: number, pitch: number, navigationOffset: boolean, heading?: number) {
        this.coordinate = coordinate
        this.zoom = zoom
        this.pitch = pitch
        this.heading = heading
        this.navigationOffset = navigationOffset
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

export class ToggleDistanceUnits implements Action {}
