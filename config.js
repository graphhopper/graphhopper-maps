/**
 * Webpack will replace this file with config-local.js if it exists
 */
const config = {
    // the url of the GraphHopper backend, either use graphhopper.com or point it to your own GH instance
    api: 'https://graphhopper.com/api/1/',
    // the tile layer used by default, see MapOptionsStore.ts for all options
    defaultTiles: 'OpenStreetMap',
    // various api keys used for the GH backend and the different tile providers
    keys: {
        graphhopper: 'missing_api_key',
        maptiler: 'missing_api_key',
        omniscale: 'missing_api_key',
        thunderforest: 'missing_api_key',
        kurviger: 'missing_api_key',
    },
    // if true there will be an option to enable the GraphHopper routing graph and the urban density visualization in the layers menu
    routingGraphLayerAllowed: false,
    // parameters used for the routing request generation
    request: {
        details: [
            'road_class',
            'road_environment',
            'surface',
            'max_speed',
            'average_speed',
            'toll',
            'track_type',
            'country',
        ],
        snapPreventions: ['ferry'],
    },
    // use this to add your own profiles. the key of each profile will be used as name and the given fields will
    // overwrite the fields of the default routing request. e.g.
    // extraProfiles: { my_car: { profile: undefined, vehicle: car }}
    // will add a profile named 'my_car' for which we send a request without the profile parameter and an additional
    // vehicle parameter that is set to 'car'
    extraProfiles: {
        'abc': {
            'profile': 'abc'
        }
    },
}

// this is needed for jest (with our current setup at least)
if (module) module.exports = config
