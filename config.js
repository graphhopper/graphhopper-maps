/**
 * Webpack will replace this file with config-local.js if it exists
 */
const config = {
    // the url of the GraphHopper routing backend, either use graphhopper.com or point it to your own GH instance
    routingApi: 'https://graphhopper.com/api/1/',
    // the url of the geocoding backend, either use graphhopper.com or point it to another geocoding service. use an empty string to disable the address search
    geocodingApi: 'https://graphhopper.com/api/1/',
    // the tile layer used by default, see MapOptionsStore.ts for all options
    defaultTiles: 'OpenStreetMap',
    // various api keys used for the GH backend and the different tile providers
    keys: {
        graphhopper: 'efc33bcc-a9e6-450b-9221-c52c5bf57de3',
        maptiler: 'missing_api_key',
        omniscale: 'missing_api_key',
        thunderforest: 'missing_api_key',
        kurviger: 'missing_api_key',
        tracestrack: 'missing_api_key',
    },
    // if true there will be an option to enable the GraphHopper routing graph and the urban density visualization in the layers menu
    routingGraphLayerAllowed: false,
    // parameters used for the routing request generation
    request: {
        details: [
            'road_class',
            'road_environment',
            'road_access',
            'surface',
            'max_speed',
            'average_speed',
            'toll',
            'track_type',
            'country',
        ],
    },

    // Use 'profiles' to define which profiles are visible and how. Useful if the /info endpoint contains too many or too "ugly" profile
    // names or in the wrong order. The key of each profile will be used as name and the given fields will overwrite the fields of the
    // default routing request. The following example is tuned towards the GraphHopper Directions API. If you have an own server you might want to adapt it.
    //
    // profiles: {
    //    car:{}, small_truck:{}, truck:{}, scooter:{},
    //    foot:{ details: ['foot_network', 'access_conditional', 'foot_conditional', 'hike_rating'] }, hike:{ details: ['foot_network', 'access_conditional', 'foot_conditional', 'hike_rating' ] },
    //    bike:{ details: ['get_off_bike', 'bike_network', 'access_conditional', 'bike_conditional', 'mtb_rating' ] }, mtb:{ details: ['get_off_bike', 'bike_network', 'access_conditional', 'bike_conditional', 'mtb_rating'] }, racingbike:{ details: ['get_off_bike', 'bike_network', 'access_conditional', 'bike_conditional', 'mtb_rating'] },
    // }
    //
    // E.g. the 'bike' entry will add a "bike" profile for which we send a request with the specified 'details' parameter. You can even change the profile itself when you specify
    // bike: { profile: 'raw_bike', ... }

    // You can 'collapse' or group certain profiles to reduce the number of profiles in the panel. Instead they're listed in the settings but still a profile icon is shown.
    // Note: the name of the group must be the default option for this group.
    profile_group_mapping: {},
    // profile_group_mapping: {
    //  car: {
    //    options: [
    //      { profile: 'car' },
    //      { profile: 'car_avoid_motorway' },
    //      { profile: 'car_avoid_ferry' },
    //      { profile: 'car_avoid_toll' }
    //    ]
    //  },
    //  bike: {
    //    options: [
    //      { profile: 'bike' },
    //      { profile: 'mtb' },
    //      { profile: 'racingbike' },
    //      { profile: 'ecargobike' }
    //    ]
    //  }
    // }

    // Configure custom basemaps. You have three options:
    // 1. Replace all default basemaps with your own
    // 2. Add custom basemaps to the existing defaults
    // 3. Disable specific default basemaps
    //
    // basemaps: {
    //     // Option 1: Replace all default basemaps with custom ones
    //     basemaps: [
    //         {
    //             name: 'My Custom Raster',
    //             type: 'raster',
    //             url: ['https://example.com/tiles/{z}/{x}/{y}.png'],
    //             attribution: '&copy; My Custom Provider',
    //             maxZoom: 18
    //         },
    //         {
    //             name: 'My Custom Vector',
    //             type: 'vector',
    //             url: 'https://example.com/style.json?key={maptiler_key}',
    //             attribution: '&copy; My Vector Provider'
    //         }
    //     ],
    //
    //     // Option 2: Add custom basemaps to defaults (commented out when using Option 1)
    //     // customBasemaps: [
    //     //     {
    //     //         name: 'Additional Custom Map',
    //     //         type: 'raster',
    //     //         url: ['https://another-provider.com/{z}/{x}/{y}{retina_suffix}.png?key={thunderforest_key}'],
    //     //         attribution: '&copy; Another Provider',
    //     //         maxZoom: 19,
    //     //         tilePixelRatio: 2  // Optional: override retina detection
    //     //     }
    //     // ],
    //
    //     // Option 3: Disable specific default basemaps by name (commented out when using Option 1)
    //     // disabledBasemaps: ['TF Transport', 'TF Cycle', 'TF Outdoors']
    // }
    //
    // Available API key placeholders for URLs:
    // - {omniscale_key} - replaced with keys.omniscale
    // - {maptiler_key} - replaced with keys.maptiler
    // - {thunderforest_key} - replaced with keys.thunderforest
    // - {kurviger_key} - replaced with keys.kurviger
    // - {retina_suffix} - replaced with '@2x' on retina displays, empty otherwise
}

// this is needed for jest (with our current setup at least)
if (module) module.exports = config
