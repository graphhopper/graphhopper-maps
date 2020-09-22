declare module 'ol-mapbox-style' {

    import {PluggableMap} from "ol";

    export function olms(map: PluggableMap | HTMLElement | string, style: string | Object): Promise<PluggableMap>

    export function apply(a: PluggableMap | HTMLElement | string, b: string | Object): PluggableMap;
}