import 'ol/ol.css'
import Map from 'ol/Map'
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import {Style} from "ol/style";
import {View} from "ol";
import {apply} from "ol-mapbox-style";

export default class Openlayers {

    private map: Map

    constructor(container: HTMLDivElement) {

        this.map = Openlayers.initMap(container)
    }

    private static initMap(container: HTMLDivElement): Map {
        const key = 'pk.eyJ1IjoiamFuZWtkZXJlcnN0ZSIsImEiOiJjajd1ZDB6a3A0dnYwMnFtamx6eWJzYW16In0.9vY7vIQAoOuPj7rg1A_pfw'
        const styleUrl = 'https://api.mapbox.com/styles/v1/janekdererste/ckf6ke0zt0lh319mydrud4q8w?access_token=' + key
        // const olMap = await olms(this.mapContainer.current, styleUrl)
        // this.map = olMap


        const olMap = new Map({
            target: container,
            //layers: [new TileLayer({source: new OSM()})],
            layers: [new VectorTileLayer({
                declutter: true,
                source: new VectorTileSource({
                    format: new MVT(),
                    url: 'https://{a-d}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v8/' +
                        '{z}/{x}/{y}.vector.pbf?access_token=' +
                        key,
                }),
                style: new Style()
            })],
            view: new View({center: [0, 0], zoom: 5})
        })

        return apply(olMap, styleUrl)
    }

    public updateSize() {
        this.map.updateSize()
    }
}