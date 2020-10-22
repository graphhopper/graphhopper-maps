import 'ol/ol.css'
import Map from 'ol/Map'
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import {Fill, Stroke, Style} from "ol/style";
import {Feature, View} from "ol";
import {fromLonLat} from "ol/proj";
import VectorSource from "ol/source/Vector";
import LineString from "ol/geom/LineString";
import VectorLayer from "ol/layer/Vector";
import BaseLayer from "ol/layer/Base";
import {MultiPoint} from "ol/geom";
import CircleStyle from "ol/style/Circle";
import {OSM} from "ol/source";
import TileLayer from "ol/layer/Tile";

const key = 'pk.eyJ1IjoiamFuZWtkZXJlcnN0ZSIsImEiOiJjajd1ZDB6a3A0dnYwMnFtamx6eWJzYW16In0.9vY7vIQAoOuPj7rg1A_pfw'

export const AvailableLayers = [
    'Mapbox', 'Osm'
]

export default class Openlayers {

    private map: Map
    private view: View
    private line_layer: VectorLayer
    private map_layer: BaseLayer

    constructor(container: HTMLDivElement) {

        this.view = new View({center: [0, 0], zoom: 5})
        this.line_layer = Openlayers.initLineLayer()
        this.map_layer = Openlayers.initOsmLayer()
        this.map = Openlayers.initMap(container, this.view, [this.line_layer, this.map_layer])
    }

    private static initLineLayer() {
        return new VectorLayer({
                zIndex: 1000, style: [
                    new Style({
                        stroke: new Stroke({
                            color: 'blue',
                            width: 7,
                        }),
                        fill: new Fill({
                            color: 'rgba(0, 0, 255, 0.1)',
                        }),

                    }),
                    new Style({
                        image: new CircleStyle({
                            radius: 10,
                            fill: new Fill({
                                color: 'orange',
                            }),
                        }),
                    })
                ]
            }
        )
    }

    private static async initMapboxLayer(): Promise<BaseLayer> {
        return new VectorTileLayer({
            declutter: true,
            source: new VectorTileSource({
                format: new MVT(),
                url: 'https://{a-d}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v8/' +
                    '{z}/{x}/{y}.vector.pbf?access_token=' +
                    key,
            }),
            zIndex: 0,
            style: new Style()
        })
    }

    private static initOsmLayer(): BaseLayer {
        return new TileLayer({source: new OSM()})
    }

    private static initMap(container: HTMLDivElement, view: View, layers: BaseLayer[]): Map {

        const olMap = new Map({
            target: container,
            layers: layers,
            view: view
        })

        // return apply(olMap, 'https://api.mapbox.com/styles/v1/janekdererste/ckf6ke0zt0lh319mydrud4q8w?access_token=' + key)
        return olMap
    }

    public updateSize() {
        this.map.updateSize()
    }

    public setPath(coordinates: [number, number][]) {

        const transformed = coordinates.map(coord => fromLonLat(coord))

        const lineString = new LineString(transformed)
        const lineFeature = new Feature({
            geometry: lineString,
            name: 'line'
        })
        const pointFeature = new Feature({
            geometry: new MultiPoint([transformed[0], transformed[transformed.length - 1]]),
            name: 'points'
        })

        const source = new VectorSource({features: [lineFeature, pointFeature]})
        this.line_layer.setSource(source)
        this.map.render()
    }

    public zoomToExtend(bbox: [number, number, number, number]) {

        const bottomLeft = fromLonLat([bbox[0], bbox[1]])
        const topRight = fromLonLat([bbox[2], bbox[3]])


        this.view.fit([bottomLeft[0], bottomLeft[1], topRight[0], topRight[1]], {
            padding: [100, 100, 100, 400], duration: 1000
        })

        this.map.getLayerGroup().getLayersArray().findIndex(layer => layer)
    }
}