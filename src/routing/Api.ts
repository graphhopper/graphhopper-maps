
const default_host = "https://graphhopper.com/api/1"
const default_base_path = "/route"

export interface RoutingArgs {
    points: [number, number][];
    key: string;
    host?: string;
    basePath?: string;
    vehicle?: string;
    data_type?: string;
    locale?: string;
    debug?: boolean;
    points_encoded?: boolean;
    instructions?: boolean;
    elevation?: boolean;
    optimize?: boolean;
}

interface RoutingRequest {
    points: [number, number][];
    vehicle: string;
    locale: string;
    debug: boolean;
    points_encoded: boolean;
    instructions: boolean;
    elevation: boolean;
    optimize: string;
    [index: string]: string | boolean | [number, number][];
}

interface ErrorResponse {
    message: string
    hints: unknown
}

export interface RoutingResult {
    info: { copyrigh: string [], took: number }
    paths: Path[]
}

export interface InfoResult {
    build_date: string
    bbox: [number, number, number, number]
    version: string
    features: any
}

export interface Path {
    distance: number
    time: number
    ascend: number
    descend: number
    points: LineString
    snapped_waypoints: LineString
    points_encoded: boolean
    bbox: [number, number, number, number]
    instructions: Instruction[]
    details: Details
    points_order: number[]
}

export interface LineString {
    type: string
    coordinates: number[][]
}

export interface Instruction {
    distance: number,
    interval: [number, number]
    points: number[][]
    sign: number
    text: string
    time: number
}

interface Details {
    street_name: [number, number, string][]
    toll: [number, number, string][]
    max_speed: [number, number, number][]
}

export async function info(key : string): Promise<InfoResult> {
    const response = await fetch(default_host + "/info?key=" + key, {
        headers: {Accept: "application/json", }
    })

    if (response.ok) {
        return await response.json();
    } else {
        throw new Error('here could be your meaningfull error message')
    }
}

export default async function route(args: RoutingArgs) {

    if (args.points_encoded === true) throw Error("Encoded points are not yet implemented")

    const request = createRequest(args)
    const url = createURL(args)

    const response = await fetch(url.toString(), {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(request),
        headers: {
            Accept: args.data_type ? args.data_type : "application/json",
            'Content-Type': "application/json"
        }
    })

    if (response.ok) {
        // there will be points encoding and getting instructions right later, but opt for the bare minimum for now
        return await response.json() as RoutingResult
    } else {
        const errorResult = await response.json() as ErrorResponse
        throw new Error(errorResult.message)
    }
}

export async function routeGet(args: RoutingArgs) {

    const request = createRequest(args);
    const url = createGetURL(args.host, args.basePath, args.key, request);

    const response = await fetch(url.toString(), {
        headers: {
            Accept: args.data_type ? args.data_type : "application/json"
        }
    });

    if (response.ok) {
        const result = await response.json();
        result.paths.forEach((path: Path) => {
            // convert encoded polyline to geojson
            if (path.points_encoded) {
                path.points = {
                    type: "LineString",
                    coordinates: decodePath(path.points, request.elevation)
                };
                path.snapped_waypoints = {
                    type: "LineString",
                    coordinates: decodePath(path.snapped_waypoints, request.elevation)
                };
            }
            if (path.instructions) {
                for (let i = 0; i < path.instructions.length; i++) {
                    const interval = path.instructions[i].interval;
                    path.instructions[i].points = path.points.coordinates.slice(
                        interval[0],
                        interval[1] + 1
                    );
                }
            }
        });
        return result;
    } else {
        // original code has GHUTIL.extracterrors
        throw Error("something went wrong ");
    }
}

function decodePath(encoded: any, is3D: any): number[][] {
    const len = encoded.length;
    let index = 0;
    const array: number[][] = [];
    let lat = 0;
    let lng = 0;
    let ele = 0;

    while (index < len) {
        let b;
        let shift = 0;
        let result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
        lat += deltaLat;

        shift = 0;
        result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const deltaLon = result & 1 ? ~(result >> 1) : result >> 1;
        lng += deltaLon;

        if (is3D) {
            // elevation
            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const deltaEle = result & 1 ? ~(result >> 1) : result >> 1;
            ele += deltaEle;
            array.push([lng * 1e-5, lat * 1e-5, ele / 100]);
        } else array.push([lng * 1e-5, lat * 1e-5]);
    }
    // var end = new Date().getTime();
    // console.log("decoded " + len + " coordinates in " + ((end - start) / 1000) + "s");
    return array;
}

function createGetURL(host = default_host,
                      basePath = default_base_path,
                      key: string,
                      options: RoutingRequest) {

    const url = new URL(host + basePath);

    url.searchParams.append("key", key)
    for (const key in options) {

        if (!options.hasOwnProperty(key)) continue; // skip inherited properties

        const value = options[key];

        if (key === "points") {
            const points = value as [number, number][];
            createPointParams(points).forEach(param => {
                url.searchParams.append(param[0], param[1]);
            });
        } else {
            url.searchParams.append(
                key,
                encodeURIComponent(value as string | boolean)
            ); // point are already filtered
        }
    }

    return url;
}

function createPointParams(points: [number, number][]): [string, string][] {
    return points.map(point => {
        return ["point", point[0] + "," + point[1]];
    });
}

function createURL(args: { host?: string, basePath?: string, key: string }) {
    const host = args.host ? args.host : default_host
    const basePath = args.basePath ? args.basePath : default_base_path
    const url = new URL(host + basePath)
    url.searchParams.append("key", args.key)
    return url
}

function createRequest(args: RoutingArgs): RoutingRequest {

    return {
        vehicle: args.vehicle || "car",
        elevation: args.elevation || false,
        debug: args.debug || false,
        instructions: args.instructions !== undefined ? args.instructions : true,
        locale: args.locale || "en",
        optimize: args.optimize !== undefined ? args.optimize.toString() : false.toString(),
        points_encoded: args.points_encoded !== undefined ? args.points_encoded : true,
        points: args.points,
    }
}

