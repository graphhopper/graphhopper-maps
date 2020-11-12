export interface Args {
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

interface Options {
    points: [number, number][];
    key: string;
    vehicle: string;
    locale: string;
    debug: boolean;
    points_encoded: boolean;
    instructions: boolean;
    elevation: boolean;
    optimize: boolean;

    [index: string]: string | boolean | [number, number][];
}

// probably this could be replaced by some geojson interface
export interface Points {
    type: string
    coordinates: number[][]
}

export interface Path {
    points: Points
    snapped_waypoints: Points
    instructions: Instruction[]
    points_encoded: boolean
    bbox: [number, number, number, number]
}

export interface Instruction {
    text: string
    interval: number[]
    points: number[][]
}

export interface Result {
    paths: Path[]
}

function copyOptions(args: Args): Options {

    return {
        vehicle: args.vehicle || "car",
        elevation: args.elevation || false,
        debug: args.debug || false,
        instructions: args.instructions || true,
        locale: args.locale || "en",
        optimize: args.optimize || false,
        points_encoded: args.points_encoded || true,
        points: args.points,
        key: args.key
    }
}

function createPointParams(points: [number, number][]): [string, string][] {
    return points.map(point => {
        return ["point", point[0] + "," + point[1]];
    });
}

function createURL(
    host = "https://graphhopper.com/api/1",
    basePath = "/route",
    options: Options
) {
    const url = new URL(host + basePath);

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

export async function doRequest(args: Args): Promise<Result> {
    const options = copyOptions(args);
    const url = createURL(args.host, args.basePath, options);

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
                    coordinates: decodePath(path.points, options.elevation)
                };
                path.snapped_waypoints = {
                    type: "LineString",
                    coordinates: decodePath(path.snapped_waypoints, options.elevation)
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