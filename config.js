/**
 * Webpack will replace this file with config-local.js if it exists
 */
const config = {
    // the url of the GraphHopper routing backend, either use graphhopper.com or point it to your own GH instance
    routingApi: 'https://graphhopper.com/api/1/',
    // the url of the geocoding backend, either use graphhopper.com or point it to another geocoding service
    geocodingApi: 'https://graphhopper.com/api/1',
    // the tile layer used by default, see MapOptionsStore.ts for all options
    defaultTiles: 'OpenStreetMap',
    // various api keys used for the GH backend and the different tile providers
    keys: {
        graphhopper: 'bfb9d728-3732-4542-9e92-f638ac1c9f3a',
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
    extraProfiles: {},
}

// this is needed for jest (with our current setup at least)
if (module) module.exports = config
