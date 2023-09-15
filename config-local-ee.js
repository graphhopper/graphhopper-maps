/**
 * Webpack will replace this file with config-local.js if it exists
 */
const config = {
    // the url of the GraphHopper backend, either use graphhopper.com or point it to your own GH instance
    //api: 'https://graphhopper.com/api/1/',
    api: 'http://localhost:8901/',
    // the tile layer used by default, see MapOptionsStore.ts for all options
    defaultTiles: 'OpenStreetMap',
    // various api keys used for the GH backend and the different tile providers
    keys: {
        graphhopper: 'dd21184a-2d7b-4b01-b07a-489558709a2e',
        maptiler: 'wYonyRi2hNgJVH2qgs81',
        omniscale: 'missing_api_key',
        thunderforest: 'missing_api_key',
        kurviger: 'b582abd4-d55d-4cb1-8f34-f4254cd52aa7',
    },
    // if true there will be an option to enable the GraphHopper routing graph and the urban density visualization in the layers menu
    routingGraphLayerAllowed: true,
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
            'urban_ee',
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
