// import mapbox like this instead of {Map} from 'mapbox-gl' because otherwise the app is missing some global mapbox state
import * as mapbox from "mapbox-gl";
import {GeoJSONSource} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const sourceKey = "route";
const lineLayerKey = "lines";
const pointsLayerKey = "points";

export default class Mapbox {
    private map: mapbox.Map;

    constructor(container: HTMLDivElement, onClick: (coordinate: [number, number]) => void) {
        this.map = new mapbox.Map({
            accessToken:
                "pk.eyJ1IjoiamFuZWtkZXJlcnN0ZSIsImEiOiJjajd1ZDB6a3A0dnYwMnFtamx6eWJzYW16In0.9vY7vIQAoOuPj7rg1A_pfw",
            container: container,
            style: "mapbox://styles/mapbox/streets-v11",
            center: [0, 0],
            zoom: 0
        });
        this.map.on("load", () => this.initLineLayer());
        this.map.on("click", e => onClick([e.lngLat.lng, e.lngLat.lat]))
        this.map.on("touchend", e => onClick([e.lngLat.lng, e.lngLat.lng]))
    }

    public updateGeometry(points: {
        type: string;
        coordinates: number[][];
    }) {
        if (points.coordinates.length > 0)
            this.addLine(points);
        else
            this.removeLine();
    }

    public updateSize() {
        this.map.resize()
    }

    public fitToExtent(extent: [number, number, number, number]) {
        const bounds = new mapbox.LngLatBounds(extent);
        this.map.fitBounds(bounds, {
            padding: {top: 100, bottom: 100, right: 100, left: 400}
        });
    }

    private initLineLayer() {
        this.map.addSource(sourceKey, {
            type: "geojson",
            data: {
                type: "Feature",
                properties: {},
                geometry: {
                    type: "Point",
                    coordinates: []
                }
            }
        });
        this.map.addLayer({
            id: lineLayerKey,
            type: "line",
            source: sourceKey,
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": "#888",
                "line-width": 8
            }
        });

        this.map.addLayer({
            id: pointsLayerKey,
            type: "circle",
            source: sourceKey,
            paint: {
                "circle-radius": 6,
                "circle-color": "#B42222"
            },
            filter: ["==", "$type", "Point"]
        });
    }

    private removeLine() {
        (this.map.getSource(sourceKey) as GeoJSONSource).setData({

            features: [],
            type: "FeatureCollection"
        })
    }

    private addLine(points: { type: string; coordinates: number[][] }) {
        (this.map.getSource(sourceKey) as GeoJSONSource).setData({
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "LineString",
                        coordinates: points.coordinates
                    }
                },
                {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "MultiPoint",
                        coordinates: [
                            points.coordinates[0],
                            points.coordinates[points.coordinates.length - 1]
                        ]
                    }
                }
            ]
        });
    }
}
