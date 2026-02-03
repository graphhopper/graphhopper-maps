const config = {
    // the url of the GraphHopper backend, either use graphhopper.com or point it to your own GH instance
    api: 'https://graphhopper.com/api/1/',
    // the tile layer used by default, see MapOptionsStore.ts for all options
    routingApi: 'https://graphhopper.com/api/1/',
    geocodingApi: 'https://graphhopper.com/api/1/',
    defaultTiles: 'OpenStreetMap',
    navigationTiles: 'Mapilion',
    // various api keys used for the GH backend and the different tile providers
    keys: {
     "graphhopper":"e96f6517-5a46-4e3d-9773-4956d7b6046f",
     "maptiler":"_undefined_",
     "omniscale":"_undefined_",
     "thunderforest":"4f283c77a8644d0b8ead1a3c3faf04ba",
     "kurviger":"b582abd4-d55d-4cb1-8f34-f4254cd52aa7"
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
        snapPreventions: ['ferry'],
    },
    profile_group_mapping: {
      car: {
        options: [
          { profile: 'car' },
          { profile: 'car_avoid_motorway' },
          { profile: 'car_avoid_ferry' },
          { profile: 'car_avoid_toll' },
        ]
      },
      racingbike: {
        options: [
          { profile: 'racingbike' },
          { profile: 'ecargobike' } 
        ]
      },
      truck: {
        options: [
          { profile: 'small_truck' },
          { profile: 'truck' },
        ]
      },
      foot: {
        options: [
          { profile: 'foot' },
          { profile: 'hike' },
        ]
      },
    },
    profiles: {
      car:{}, car_avoid_motorway:{}, car_avoid_toll:{}, car_avoid_ferry:{},
      small_truck:{}, truck:{},
      scooter:{},
      foot:{ details: ['foot_network', 'access_conditional', 'foot_conditional', 'hike_rating'] },
      hike:{ details: ['foot_network', 'access_conditional', 'foot_conditional', 'hike_rating' ] },
      bike:{ details: ['get_off_bike', 'bike_network', 'access_conditional', 'bike_conditional', 'mtb_rating' ] },
      mtb:{ details: ['get_off_bike', 'bike_network', 'access_conditional', 'bike_conditional', 'mtb_rating'] },
      racingbike:{ details: ['get_off_bike', 'bike_network', 'access_conditional', 'bike_conditional', 'mtb_rating'] },
      ecargobike:{ details: ['get_off_bike', 'bike_network', 'access_conditional', 'bike_conditional', 'mtb_rating'] },
    },
}
