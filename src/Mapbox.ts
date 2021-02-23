// import mapbox like this instead of {Map} from 'mapbox-gl' because otherwise the app is missing some global mapbox state
import * as mapbox from 'mapbox-gl'
import { GeoJSONSource, Marker } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Coordinate, QueryPoint, SetPointFromCoordinate } from '@/stores/QueryStore'
import Dispatcher from '@/stores/Dispatcher'

const lineSourceKey = 'route'
const lineLayerKey = 'lines'

// have this right here for now. Not sure if this needs to be abstracted somewhere else
const mediaQuery = window.matchMedia('(max-width: 640px)')

export default class Mapbox {
    private readonly map: mapbox.Map
    private readonly onCoordinateSelected: (coordinate: Coordinate) => void
    private markers: Marker[] = []
    private mapReady = false

    constructor(
        container: HTMLDivElement,
        onCoordinateSelected: (coordinate: Coordinate) => void,
        onReady: () => void
    ) {
        this.map = new mapbox.Map({
            accessToken:
                'pk.eyJ1IjoiamFuZWtkZXJlcnN0ZSIsImEiOiJjajd1ZDB6a3A0dnYwMnFtamx6eWJzYW16In0.9vY7vIQAoOuPj7rg1A_pfw',
            container: container,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [0, 0],
            zoom: 0,
        })
        this.onCoordinateSelected = onCoordinateSelected

        this.map.on('load', () => {
            this.initLineLayer()
            this.mapReady = true
            onReady()
        })
        this.map.on('click', e => onCoordinateSelected(e.lngLat))
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

    public updateQueryPoints(points: QueryPoint[]) {
        if (!this.mapReady) return

        this.markers.forEach(marker => marker.remove())
        this.markers = points
            .map((point, i) => {
                return { index: i, point: point }
            })
            .filter(indexPoint => indexPoint.point.isInitialized)
            .map(indexPoint =>
                new Marker({
                    color: Mapbox.getMarkerColor(indexPoint.index, points.length),
                    draggable: true,
                })
                    .setLngLat(indexPoint.point.point)
                    .on('dragend', (e: { type: string; target: Marker }) => {
                        const marker = e.target
                        const coords = marker.getLngLat()
                        console.log(coords)
                        Dispatcher.dispatch(new SetPointFromCoordinate(coords, indexPoint.point))
                    })
            )
        this.markers.forEach(marker => marker.addTo(this.map))
    }

    static getMarkerColor(index: number, length: number) {
        if (index === 0) return '#417900'
        if (index === length - 1) return '#F97777'
        return ''
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

    private removeLine() {
        if (!this.mapReady) return
        ;(this.map.getSource(lineSourceKey) as GeoJSONSource).setData({
            features: [],
            type: 'FeatureCollection',
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
