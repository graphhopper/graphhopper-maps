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
    doRequest(): Promise<any>
}

declare interface RoutingConstructor {
    new (args: any): GraphHopperRouting
}

declare interface GHInputConstructor {
    new (lat: number, lng: number): GHInput
}

declare interface GraphHopper {
    Routing: RoutingConstructor,
    Input: GHInputConstructor
}

declare const GraphHopper: GraphHopper





