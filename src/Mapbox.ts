import { GeoJSONSource, LngLatBounds, Map, MapMouseEvent, Marker } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { QueryPoint } from '@/stores/QueryStore'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint } from '@/actions/Actions'
import { Popup } from '@/Popup'
import { Bbox, Path } from '@/routing/Api'

const lineSourceKey = 'route'
const lineLayerKey = 'lines'

// have this right here for now. Not sure if this needs to be abstracted somewhere else
const mediaQuery = window.matchMedia('(max-width: 640px)')

export default class Mapbox {
    private readonly map: Map
    private markers: Marker[] = []
    private popup: Popup

    private mapIsReady = false

    constructor(container: HTMLDivElement, onMapReady: () => void, onClick: (e: MapMouseEvent) => void) {
        this.map = new Map({
            container: container,
            accessToken:
                'pk.eyJ1IjoiamFuZWtkZXJlcnN0ZSIsImEiOiJjajd1ZDB6a3A0dnYwMnFtamx6eWJzYW16In0.9vY7vIQAoOuPj7rg1A_pfw',
            style: 'mapbox://styles/mapbox/streets-v11',
        })

        this.map.on('load', () => {
            this.initLineLayer()
            this.mapIsReady = true
            onMapReady()
        })

        this.map.on('click', onClick)
        this.map.on('contextmenu', e => this.popup.show(e.lngLat))

        this.popup = new Popup(this.map)
    }

    remove() {
        this.map.remove()
    }

    drawLine(path: Path) {
        if (!this.mapIsReady) return

        console.log('draw line')
        const source = this.map.getSource(lineSourceKey) as GeoJSONSource
        if (path.points.coordinates.length > 0) {
            source.setData({
                type: 'FeatureCollection',
                features: [
                    {
                        type: 'Feature',
                        properties: {},
                        geometry: path.points as GeoJSON.LineString,
                    },
                ],
            })
        } else {
            source.setData({
                features: [],
                type: 'FeatureCollection',
            })
        }
    }

    drawMarkers(queryPoints: QueryPoint[]) {
        if (!this.mapIsReady) return

        this.markers.forEach(marker => marker.remove())
        this.markers = queryPoints
            .map((point, i) => {
                return { index: i, point: point }
            })
            .filter(indexPoint => indexPoint.point.isInitialized)
            .map(indexPoint =>
                new Marker({
                    color: indexPoint.point.color,
                    draggable: true,
                })
                    .setLngLat(indexPoint.point.coordinate)
                    .on('dragend', (e: { type: string; target: Marker }) => {
                        const marker = e.target
                        const coords = marker.getLngLat()
                        Dispatcher.dispatch(
                            new SetPoint({
                                ...indexPoint.point,
                                coordinate: coords,
                                queryText: coords.lng + ', ' + coords.lat,
                            })
                        )
                    })
            )
        this.markers.forEach(marker => marker.addTo(this.map))
    }

    fitBounds(bbox: Bbox) {
        if (bbox.every(num => num !== 0))
            this.map.fitBounds(new LngLatBounds(bbox), {
                padding: Mapbox.getPadding(),
            })
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
}
