// import mapbox like this instead of {Map} from 'mapbox-gl' because otherwise the app is missing some global mapbox state
import * as mapbox from 'mapbox-gl'
import {GeoJSONSource} from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const lineSourceKey = 'route'
const pointsSourceKey = 'query'
const lineLayerKey = 'lines'
const pointsLayerKey = 'points'

// have this right here for now. Not sure if this needs to be abstracted somewhere else
const mediaQuery = window.matchMedia('(max-width: 640px)')

export default class Mapbox {
    private map: mapbox.Map
    private mapReady = false

    constructor(container: HTMLDivElement, onClick: (coordinate: [number, number]) => void, onReady: () => void) {
        this.map = new mapbox.Map({
            accessToken:
                'pk.eyJ1IjoiamFuZWtkZXJlcnN0ZSIsImEiOiJjajd1ZDB6a3A0dnYwMnFtamx6eWJzYW16In0.9vY7vIQAoOuPj7rg1A_pfw',
            container: container,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [0, 0],
            zoom: 0,
        })
        this.map.on('load', () => {
            this.initLineLayer()
            this.initPointsLayer()
            this.mapReady = true
            onReady()
        })
        this.map.on('click', e => onClick([e.lngLat.lng, e.lngLat.lat]))
    }

    private static getPadding() {
        return mediaQuery.matches
            ? { top: 200, bottom: 16, right: 16, left: 16 }
            : {
                  top: 100,
                  bottom: 100,
                  right: 100,
                  left: 400,
              }
    }

    public updateRoute(points: { type: string; coordinates: number[][] }) {
        if (points.coordinates.length > 0) this.addLine(points)
        else this.removeLine()
    }

    public updateSize() {
        this.map.resize()
    }

    public updatePoints(points: [number, number][]) {
        // this resets everything all the time. maybe keep a reference and only exchange the coordinates of the Feature
        // if this yields bad performance
        this.addPoints({
            type: 'MultiPoint',
            coordinates: points,
        })
    }

    public fitToExtent(extent: [number, number, number, number]) {
        const bounds = new mapbox.LngLatBounds(extent)
        this.map.fitBounds(bounds, {
            padding: Mapbox.getPadding(),
        })
    }

    private initLineLayer() {
        this.map.addSource(lineSourceKey, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [],
                },
            },
        })
        this.map.addLayer({
            id: lineLayerKey,
            type: 'line',
            source: lineSourceKey,
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
            },
            paint: {
                'line-color': '#888',
                'line-width': 8,
            },
        })
    }

    private initPointsLayer() {
        this.map.addSource(pointsSourceKey, {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [],
                },
            },
        })
        this.map.addLayer({
            id: pointsLayerKey,
            type: 'circle',
            source: pointsSourceKey,
            paint: {
                'circle-radius': 6,
                'circle-color': '#B42222',
            },
            filter: ['==', '$type', 'Point'],
        })
    }

    private removeLine() {
        if (!this.mapReady) return
        ;(this.map.getSource(lineSourceKey) as GeoJSONSource).setData({
            features: [],
            type: 'FeatureCollection',
        })
    }

    private addPoints(points: { type: string; coordinates: number[][] }) {
        if (!this.mapReady) return
        ;(this.map.getSource(pointsSourceKey) as GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'MultiPoint',
                        coordinates: points.coordinates,
                    },
                },
            ],
        })
    }

    private addLine(points: { type: string; coordinates: number[][] }) {
        if (!this.mapReady) return
        ;(this.map.getSource(lineSourceKey) as GeoJSONSource).setData({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: points.coordinates,
                    },
                },
            ],
        })
    }
}
