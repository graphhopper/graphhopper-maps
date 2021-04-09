import Store from '@/stores/Store'
import { Action } from '@/stores/Dispatcher'
import { MapIsLoaded, SelectMapStyle } from '@/actions/Actions'

const osmApiKey = 'mapsgraph-bf48cc0b'
const thunderforestApiKey = '?apikey=95b7c76e19c04e36ab9756f2cdf15b32'
const kurvigerApiKey = '?key=b582abd4-d55d-4cb1-8f34-f4254cd52aa7'
const osmAttribution =
    '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'

export interface MapOptionsStoreState {
    styleOptions: StyleOption[]
    selectedStyle: StyleOption
    isMapLoaded: boolean
}

export interface StyleOption {
    name: string
    type: 'raster' | 'vector'
    url: string[] | string
    attribution: string
    maxZoom?: number
}

export interface RasterStyle extends StyleOption {
    type: 'raster'
    url: string[]
}

export interface VectorStyle extends StyleOption {
    type: 'vector'
    url: string
}

export default class MapOptionsStore extends Store<MapOptionsStoreState> {
    protected getInitialState(): MapOptionsStoreState {
        const defaultStyle: VectorStyle = {
            name: 'Mapbox',
            url: 'mapbox://styles/mapbox/streets-v11',
            type: 'vector',
            attribution: 'mapbox',
        }
        return {
            selectedStyle: defaultStyle,
            styleOptions: [
                defaultStyle,
                {
                    name: 'OpenStreetMap',
                    type: 'raster',
                    url: [
                        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    ],
                    attribution: osmAttribution,
                },
                {
                    name: 'Omniscale',
                    type: 'raster',
                    url: ['https://maps.omniscale.net/v2/' + osmApiKey + '/style.default/{z}/{x}/{y}.png'],
                    attribution: osmAttribution + ', &copy; <a href="https://maps.omniscale.com/">Omniscale</a>',
                },
                {
                    name: 'Esri Aerial',
                    type: 'raster',
                    url: [
                        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                    ],
                    attribution:
                        '&copy; <a href="http://www.esri.com/">Esri</a>' +
                        ' i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                    maxZoom: 18,
                },
                {
                    name: 'TF Transport',
                    type: 'raster',
                    url: [
                        'https://a.tile.thunderforest.com/transport/{z}/{x}/{y}@2x.png' + thunderforestApiKey,
                        'https://b.tile.thunderforest.com/transport/{z}/{x}/{y}@2x.png' + thunderforestApiKey,
                        'https://c.tile.thunderforest.com/transport/{z}/{x}/{y}@2x.png' + thunderforestApiKey,
                    ],
                    attribution:
                        osmAttribution +
                        ', <a href="https://www.thunderforest.com/maps/transport/" target="_blank">Thunderforest Transport</a>',
                },
                {
                    name: 'TF Cycle',
                    type: 'raster',
                    url: [
                        'https://a.tile.thunderforest.com/cycle/{z}/{x}/{y}.png@2x' + thunderforestApiKey,
                        'https://b.tile.thunderforest.com/cycle/{z}/{x}/{y}.png@2x' + thunderforestApiKey,
                        'https://c.tile.thunderforest.com/cycle/{z}/{x}/{y}.png@2x' + thunderforestApiKey,
                    ],
                    attribution:
                        osmAttribution +
                        ', <a href="https://www.thunderforest.com/maps/opencyclemap/" target="_blank">Thunderforest Cycle</a>',
                },
                {
                    name: 'TF Outdoors',
                    type: 'raster',
                    url: [
                        'https://a.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png@2x' + thunderforestApiKey,
                        'https://b.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png@2x' + thunderforestApiKey,
                        'https://c.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png@2x' + thunderforestApiKey,
                    ],
                    attribution:
                        osmAttribution +
                        ', <a href="https://www.thunderforest.com/maps/outdoors/" target="_blank">Thunderforest Outdoors</a>',
                },
                {
                    name: 'TF Neighbourhood',
                    type: 'raster',
                    url: [
                        'https://a.tile.thunderforest.com/neighbourhood/{z}/{x}/{y}@2x.png' + thunderforestApiKey,
                        'https://b.tile.thunderforest.com/neighbourhood/{z}/{x}/{y}@2x.png' + thunderforestApiKey,
                        'https://c.tile.thunderforest.com/neighbourhood/{z}/{x}/{y}@2x.png' + thunderforestApiKey,
                    ],
                    attribution:
                        osmAttribution +
                        ', <a href="https://thunderforest.com/maps/neighbourhood/" target="_blank">Thunderforest Neighbourhood</a>',
                },
                {
                    name: 'Kurviger Liberty',
                    type: 'raster',
                    url: [
                        'https://a-tiles.mapilion.com/raster/styles/kurviger-liberty/{z}/{x}/{y}@2x.png' +
                            kurvigerApiKey,
                        'https://b-tiles.mapilion.com/raster/styles/kurviger-liberty/{z}/{x}/{y}@2x.png' +
                            kurvigerApiKey,
                        'https://c-tiles.mapilion.com/raster/styles/kurviger-liberty/{z}/{x}/{y}@2x.png' +
                            kurvigerApiKey,
                        'https://d-tiles.mapilion.com/raster/styles/kurviger-liberty/{z}/{x}/{y}@2x.png' +
                            kurvigerApiKey,
                        'https://e-tiles.mapilion.com/raster/styles/kurviger-liberty/{z}/{x}/{y}@2x.png' +
                            kurvigerApiKey,
                    ],
                    attribution:
                        osmAttribution +
                        ',&copy; <a href="https://kurviger.de/" target="_blank">Kurviger</a> &copy; <a href="https://mapilion.com/attribution" target="_blank">Mapilion</a> <a href="http://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a>',
                },
                /* The original client has this but those options yield cors errors with mapbox yields a cors error
                {
                    name: 'Lyrk',
                    type: 'raster',
                    url: ['https://tiles.lyrk.org/lr/{z}/{x}/{y}?apikey=6e8cfef737a140e2a58c8122aaa26077'],
                    attribution: osmAttribution + ', <a href="https://geodienste.lyrk.de/">Lyrk</a>',
                },
                {
                    name: 'WanderReitKarte',
                    type: 'raster',
                    url: [
                        'http://topo.wanderreitkarte.de/topo/{z}/{x}/{y}.png',
                        'http://topo2.wanderreitkarte.de/topo/{z}/{x}/{y}.png',
                        'http://topo3.wanderreitkarte.de/topo/{z}/{x}/{y}.png',
                        'http://topo4.wanderreitkarte.de/topo/{z}/{x}/{y}.png',
                    ],
                    attribution:
                        osmAttribution + ', <a href="http://wanderreitkarte.de" target="_blank">WanderReitKarte</a>',
                },
                {
                    name: 'Sorbian Language',
                    type: 'raster',
                    url: ['http://a.tile.openstreetmap.de/tiles/osmhrb/{z}/{x}/{y}.png'],
                    attribution:
                        osmAttribution + ', <a href="http://www.alberding.eu/">&copy; Alberding GmbH, CC-BY-SA</a>',
                },
                {
                    name: 'OpenStreetmap.de',
                    type: 'raster',
                    url: [
                        'http://a.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
                        'http://b.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
                        'http://c.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
                    ],
                    attribution: osmAttribution,
                },

                 */
            ],
            isMapLoaded: false,
        }
    }

    reduce(state: MapOptionsStoreState, action: Action): MapOptionsStoreState {
        if (action instanceof SelectMapStyle) {
            return {
                ...state,
                selectedStyle: action.styleOption,
                isMapLoaded: false,
            }
        } else if (action instanceof MapIsLoaded) {
            return {
                ...state,
                isMapLoaded: true,
            }
        }
        return state
    }
}
