import 'ol/ol.css'
import Map from 'ol/Map'
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import {Fill, Stroke, Style} from "ol/style";
import {Feature, View} from "ol";
import {apply} from "ol-mapbox-style";
import {fromLonLat} from "ol/proj";
import VectorSource from "ol/source/Vector";
import LineString from "ol/geom/LineString";
import VectorLayer from "ol/layer/Vector";
import BaseLayer from "ol/layer/Base";
import {MultiPoint} from "ol/geom";
import CircleStyle from "ol/style/Circle";

export default class Openlayers {

    private map: Map
    private view: View
    private line_layer: VectorLayer

    constructor(container: HTMLDivElement) {

        this.view = new View({center: [0, 0], zoom: 5})
        this.line_layer = new VectorLayer({
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
        this.map = Openlayers.initMap(container, this.view, [this.line_layer])
    }

    private static initMap(container: HTMLDivElement, view: View, layers: BaseLayer[]): Map {
        const key = 'pk.eyJ1IjoiamFuZWtkZXJlcnN0ZSIsImEiOiJjajd1ZDB6a3A0dnYwMnFtamx6eWJzYW16In0.9vY7vIQAoOuPj7rg1A_pfw'
        const styleUrl = 'https://api.mapbox.com/styles/v1/janekdererste/ckf6ke0zt0lh319mydrud4q8w?access_token=' + key
        // const olMap = await olms(this.mapContainer.current, styleUrl)
        // this.map = olMap

        layers.push(new VectorTileLayer({
            declutter: true,
            source: new VectorTileSource({
                format: new MVT(),
                url: 'https://{a-d}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v8/' +
                    '{z}/{x}/{y}.vector.pbf?access_token=' +
                    key,
            }),
            zIndex: 0,
            style: new Style()
        }))

        const olMap = new Map({
            target: container,
            //layers: [new TileLayer({source: new OSM()})],
            layers: layers,
            view: view
        })

        return apply(olMap, styleUrl)
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
    }
}