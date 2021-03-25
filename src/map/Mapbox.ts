import { GeoJSONSource, GeoJSONSourceRaw, LineLayer, LngLatBounds, Map, MapMouseEvent, Marker } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { QueryPoint } from '@/stores/QueryStore'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint, SetSelectedPath } from '@/actions/Actions'
import { Popup } from '@/map/Popup'
import { Bbox, Path } from '@/routing/Api'
import { FeatureCollection, LineString } from 'geojson'

const selectedPathSourceKey = 'selectedPathSource'
const selectedPathLayerKey = 'selectedPathLayer'
const pathsSourceKey = 'pathsSource'
const pathsLayerKey = 'pathsLayer'

// have this right here for now. Not sure if this needs to be abstracted somewhere else
const mediaQuery = window.matchMedia('(max-width: 640px)')

export default class Mapbox {
    private readonly map: Map
    private markers: Marker[] = []
    private popup: Popup
    private currentPaths: { path: Path; index: number }[] = []

    private mapIsReady = false

    constructor(container: HTMLDivElement, onMapReady: () => void, onClick: (e: MapMouseEvent) => void) {
        this.map = new Map({
            container: container,
            accessToken:
                'pk.eyJ1IjoiamFuZWtkZXJlcnN0ZSIsImEiOiJjajd1ZDB6a3A0dnYwMnFtamx6eWJzYW16In0.9vY7vIQAoOuPj7rg1A_pfw',
            style: 'mapbox://styles/mapbox/streets-v11',
        })

        this.map.on('load', () => {
            this.initLineLayers()
            this.mapIsReady = true
            onMapReady()
        })

        this.map.on('click', onClick)
        this.map.on('contextmenu', e => this.popup.show(e.lngLat))

        // set up selection of alternative paths
        // de-register default onClick handler when an alternative path is hovered
        this.map.on('mouseenter', pathsLayerKey, () => {
            this.map.getCanvasContainer().style.cursor = 'pointer'
            this.map.off('click', onClick)
        })

        // select an alternative path if clicked
        this.map.on('click', pathsLayerKey, e => {
            const features = this.map.queryRenderedFeatures(e.point, { layers: [pathsLayerKey] })
            if (features.length > 0) {
                const index = features[0].properties!.index
                const path = this.currentPaths.find(indexPath => indexPath.index === index)
                Dispatcher.dispatch(new SetSelectedPath(path!.path))
            }
        })

        // re-register default click handler if mouse leaves alternative paths
        this.map.on('mouseleave', pathsLayerKey, () => {
            this.map.getCanvasContainer().style.cursor = ''
            this.map.on('click', onClick)
        })

        this.popup = new Popup(this.map)
    }

    remove() {
        this.map.remove()
    }

    drawPaths(paths: Path[], selectedPath: Path) {
        this.currentPaths = paths
            .map((path, i) => {
                return {
                    path: path,
                    index: i,
                }
            })
            .filter(indexPath => indexPath.path !== selectedPath)
        this.drawUnselectedPaths(this.currentPaths)
        this.drawSelectedPath(selectedPath)
    }

    drawSelectedPath(path: Path) {
        const featureCollection: FeatureCollection = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {},
                    geometry: path.points as LineString,
                },
            ],
        }

        this.setGeoJsonSource(selectedPathSourceKey, featureCollection)
    }

    drawUnselectedPaths(indexPaths: { path: Path; index: number }[]) {
        const featureCollection: FeatureCollection = {
            type: 'FeatureCollection',
            features: indexPaths.map(indexPath => {
                return {
                    type: 'Feature',
                    properties: {
                        index: indexPath.index,
                    },
                    geometry: indexPath.path.points as LineString,
                }
            }),
        }

        this.setGeoJsonSource(pathsSourceKey, featureCollection)
    }

    setGeoJsonSource(sourceKey: string, featureCollection: FeatureCollection) {
        if (!this.mapIsReady) return
        try {
            const source = this.map.getSource(sourceKey) as GeoJSONSource
            if (featureCollection.features.length > 0) {
                source.setData(featureCollection)
            } else {
                source.setData({
                    features: [],
                    type: 'FeatureCollection',
                })
            }
        } catch (error) {
            console.log(error)
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

    private initLineLayers() {
        const source: GeoJSONSourceRaw = {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: [],
                },
            },
        }

        const pathsLayer: LineLayer = {
            id: pathsLayerKey,
            type: 'line',
            source: pathsSourceKey,
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
            },
            paint: {
                'line-color': '#5B616A',
                'line-width': 6,
                'line-opacity': 0.8,
            },
        }

        this.map.addSource(pathsSourceKey, source)
        this.map.addLayer(pathsLayer, 'road-label')

        this.map.addSource(selectedPathSourceKey, source)
        this.map.addLayer(
            {
                ...pathsLayer,
                id: selectedPathLayerKey,
                source: selectedPathSourceKey,
                paint: {
                    'line-color': '#275DAD',
                    'line-width': 8,
                },
            },
            'road-label'
        )
    }
}
