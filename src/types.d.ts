declare module 'ol-mapbox-style' {

    import {PluggableMap} from "ol";

    export function olms(map: PluggableMap | HTMLElement | string, style: string | Object): Promise<PluggableMap>

    export function apply(a: PluggableMap | HTMLElement | string, b: string | Object): PluggableMap;
}
// somehow graphhopper client is mounted onto the window object and therefore is available as global variable
// this would be nice to change I guess

declare interface GHInput {
}

declare interface GraphHopperRouting {

    addPoint(point: GHInput): void

    doRequest(): Promise<GHResult>
}

declare interface GHResult {
    paths: GHPath[]
}

declare interface GHPath {
    ascend: number
    bbox: [number, number, number, number]
    descend: number
    details: any
    distance: number
    instructions: GHInstruction[]
    points: GHPoints
    points_encoded: true
    snapped_waypoints: any
    time: number
    transfers: number
    weight: number
}

declare interface GHInstruction {
    distance: number
    heading: number
    sign: number
    interval: [number, number]
    points: [number, number][]
    street_name: string
    text: string
    time: number
}

// this can probably replaced with some geojson declaration
declare interface GHPoints {
    coordinates: [number, number][]
    type: string
}

declare interface RoutingConstructor {
    new(args: any): GraphHopperRouting
}

declare interface GHInputConstructor {
    new(lat: number, lng: number): GHInput
}

declare interface GraphHopper {
    Routing: RoutingConstructor,
    Input: GHInputConstructor
}

declare const GraphHopper: GraphHopper





