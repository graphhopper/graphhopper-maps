/**
 * Webpack will replace this file with config-local.js if it exists
 */
const config = {
   // routingApi: 'https://graphhopper.com/api/1/',
    routingApi: 'http://localhost:8989/',
   // geocodingApi: 'https://graphhopper.com/api/1/',
    geocodingApi: 'http://localhost:8080/',
    defaultTiles: 'Planetiler',
    routingGraphLayerAllowed: true,
    keys: {
        graphhopper: 'no_api_key',
        maptiler: 'no_api_key',
        omniscale: 'no_api_key',
        thunderforest: 'no_api_key',
        kurviger: 'no_api_key',
        tracestrack: 'no_api_key'
    },
    externalMVTLayer: {
        // metric: dist,time or traffic_time -> specifies by which metric the GH routes shall be compared to the benchmark
        // alternative: -1, 0, 1, ... -> specifies which alternative route shall be taken from the benchmark. 0 is the 'best' route. -1 means we use the one that is closest to GH with respect to metric
        // profile: the GH profile we use for the comparison
        // min_error: for example a value of 10 means that only benchmarks with relative error >10% (regarding metric,profile+alternative)
        // only_if_first_two_profiles_different: if true only benchmarks are drawn on the map for which the GH results (regarding metric) for the first two profiles differ (by more than 1%)
        url: 'http://135.181.79.179:8900/benchmarks-mvt/{z}/{x}/{y}.mvt?metric=dist&alternative=-1&profile=car&min_error=0&only_if_first_two_profiles_different=true',
        styles: {
            // use this
            'benchmark': {
                color: [255, 0, 0, 0.8], // red
                width: 3
            },
            'gh_car': {
                color: [0, 255, 0, 0.8], // green
                width: 3
            },
            'gh_car_old_ud_ee': {
                color: [0, 0, 255, 0.8], // blue
                width: 3
            },
        }
    },
    request: {
        details: ["road_class","road_environment","road_access","surface","max_speed","average_speed","toll","track_type","country"],
        snapPreventions: []
    },
    profile_group_mapping: {},
    //profile_group_mapping: {
    //   car: {
    //     options: [
    //       { profile: 'car',  },
    //       { profile: 'car_avoid_motorway' },
    //       { profile: 'car_avoid_ferry' },
    //       { profile: 'car_avoid_toll' }
    //     ]
    //   },
    //},
    //   racingbike: {
    //     options: [
    //       { profile: 'racingbike' },
    //       { profile: 'ecargobike' }
    //     ]
    //   },
    //   truck: {
    //     options: [
    //       { profile: 'small_truck' },
    //       { profile: 'truck' }
    //     ]
    //   },
    //   foot: {
    //     options: [
    //       { profile: 'foot' },
    //       { profile: 'hike' }
    //     ]
    //   }
    // },
    profiles: {
      car:{},
      foot:{ details: ['foot_network', 'access_conditional', 'foot_conditional', 'hike_rating'] }, 
      bike:{ details: ['get_off_bike', 'access_conditional', 'bike_network', 'bike_conditional' ] }, 
    }
}
