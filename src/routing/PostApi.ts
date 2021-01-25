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
    key: string;
    vehicle: string;
    locale: string;
    debug: boolean;
    points_encoded: boolean;
    instructions: boolean;
    elevation: boolean;
    optimize: boolean;
}

interface ErrorResponse {
    message: string
    hints: unknown
}

interface RoutingResult {
    info: { copyrigh: string [], took: number }
    paths: Path[]
}

interface Path {
    bbox: [number, number, number, number]
    distance: number
    instructions: Instruction[]
    points: [number, number]
    points_encoded: boolean
    details: Details
    time: number
}

interface Instruction {
    distance: number,
    interval: [number, number]
    sign: number
    text: string
    time: number
}

interface Details {
    street_name: [number, number, string][]
    toll: [number, number, string][]
    max_speed: [number, number, number][]
}

export default async function route(args: RoutingArgs) {

    if (args.points_encoded === true) throw Error("Encoded points are not yet implemented")

    const request = createRequest(args)
    const url = createURL(args)

    const response = await fetch(url.toString(), {
        headers: {
            Accept: args.data_type ? args.data_type : "application/json",
            method: 'POST',
            body: JSON.stringify(request)
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

function createURL(args: { host?: string, basePath?: string, key: string }) {
    const host = args.host ? args.host : "https://graphhopper.com/api/1"
    const basePath = args.basePath ? args.basePath : "/route"
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
        optimize: args.optimize || false,
        points_encoded: args.points_encoded !== undefined ? args.points_encoded : true,
        points: args.points,
        key: args.key
    }
}