import { CustomModel } from '@/stores/QueryStore'

export const customModelExamples: { [key: string]: CustomModel } = {
    default_example: {
        distance_influence: 15,
        priority: [{ if: 'road_environment == FERRY', multiply_by: '0.9' }],
        speed: [],
        areas: {
            type: 'FeatureCollection',
            features: []
        }
    },
    exclude_motorway: {
        priority: [{ if: 'road_class == MOTORWAY', multiply_by: '0.0' }]
    },
    limit_speed: {
        speed: [
            { if: 'true', limit_to: '100' },
            { if: 'road_class == TERTIARY', limit_to: '80' }
        ]
    },
    exclude_area: {
        priority: [{ if: 'in_berlin_bbox', multiply_by: '0' }],
        areas: {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    id: 'berlin_bbox',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        coordinates: [
                            [
                                [13.253, 52.608],
                                [13.228, 52.437],
                                [13.579, 52.447],
                                [13.563, 52.609],
                                [13.253, 52.608]
                            ]
                        ]
                    }
                }
            ]
        }
    },
    cargo_bike: {
        speed: [{ if: 'road_class == TRACK', limit_to: '2' }],
        priority: [{ if: 'max_width < 1.5 || road_class == STEPS', multiply_by: '0' }]
    },
    combined: {
        distance_influence: 100,
        speed: [{ if: 'road_class == TRACK || road_environment == FERRY || surface == DIRT', limit_to: '10' }],
        priority: [
            { if: 'road_environment == TUNNEL || toll == ALL', multiply_by: '0.5' },
            { if: 'max_weight < 3 || max_height < 2.5', multiply_by: '0.0' }
        ]
    }
}

export function customModel2prettyString(customModel: CustomModel) {
    return JSON.stringify(customModel, null, 2)
}