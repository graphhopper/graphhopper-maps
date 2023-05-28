import { CustomModel } from '@/stores/QueryStore'

export const customModelExamples: { [key: string]: CustomModel } = {
    default_example: {
        distance_influence: 15,
        priority: [{ if: 'road_environment == FERRY', multiply_by: '0.9' }],
        speed: [],
        areas: {
            type: 'FeatureCollection',
            features: [],
        },
    },
    exclude_motorway: {
        priority: [{ if: 'road_class == MOTORWAY', multiply_by: '0.0' }],
    },
    limit_speed: {
        speed: [
            { if: 'true', limit_to: '100' },
            { if: 'road_class == TERTIARY', limit_to: '80' },
        ],
    },
    cargo_bike: {
        speed: [{ if: 'road_class == TRACK', limit_to: '2' }],
        priority: [{ if: 'max_width < 1.5 || road_class == STEPS', multiply_by: '0' }],
    },
    bike_network: {
        priority: [{ if: 'bike_network == MISSING', multiply_by: '0.5' }],
    },
    combined: {
        distance_influence: 100,
        speed: [{ if: 'road_class == TRACK || road_environment == FERRY || surface == DIRT', limit_to: '10' }],
        priority: [
            { if: 'road_environment == TUNNEL || toll == ALL', multiply_by: '0.5' },
            { if: 'max_weight < 3 || max_height < 2.5', multiply_by: '0.0' },
        ],
    },
}

export function customModel2prettyString(customModel: CustomModel) {
    return JSON.stringify(customModel, null, 2)
}
