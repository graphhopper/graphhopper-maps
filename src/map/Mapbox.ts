import { coordinateToText } from '@/Converters'
import mapboxgl, {
    GeoJSONSource,
    GeoJSONSourceRaw,
    LineLayer,
    LngLatBounds,
    Map,
    MapTouchEvent,
    Marker,
    Point,
    Style
} from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Coordinate, QueryPoint } from '@/stores/QueryStore'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint, SetSelectedPath } from '@/actions/Actions'
import { Popup } from '@/map/Popup'
import { FeatureCollection, LineString } from 'geojson'
import { Bbox, Path } from '@/api/graphhopper'
import { RasterStyle, StyleOption, VectorStyle } from '@/stores/MapOptionsStore'
import { createMapMarker } from 'leaflet.heightgraph/src/heightgraph'
import { PathDetailsPoint } from '@/stores/PathDetailsStore'

const selectedPathSourceKey = 'selectedPathSource'
const selectedPathLayerKey = 'selectedPathLayer'
const pathsSourceKey = 'pathsSource'
const pathsLayerKey = 'pathsLayer'
const highlightedPathSegmentSourceKey = 'highlightedPathSegmentSource'
const highlightedPathSegmentLayerKey = 'highlightedPathSegmentLayer'

// have this right here for now. Not sure if this needs to be abstracted somewhere else
const mediaQuery = window.matchMedia('(max-width: 640px)')

export default class Mapbox {
    private readonly map: Map
    private markers: Marker[] = []
    private popup: Popup
    private currentPaths: { path: Path; index: number }[] = []
    private pathDetailsMarker: Marker | null = null

    private mapIsReady = false
    private isFirstBounds = true
    private isRemoved = false

    constructor(
        container: HTMLDivElement,
        mapStyle: StyleOption,
        onMapReady: () => void
    ) {
        this.map = new Map({
            container: container,
            accessToken:
                'pk.eyJ1IjoiamFuZWtkZXJlcnN0ZSIsImEiOiJjajd1ZDB6a3A0dnYwMnFtamx6eWJzYW16In0.9vY7vIQAoOuPj7rg1A_pfw',
            style: Mapbox.getStyle(mapStyle),
            maxBounds: [[-180, -90], [180, 90]],
            renderWorldCopies: false
        })

        // add controls
        this.popup = new Popup(this.map)

        this.map.on('load', () => {
            this.initLineLayers()
            this.mapIsReady = true
            onMapReady()
        })

        this.map.on('contextmenu', e => this.popup.show(e.lngLat))

        // set up selection of alternative paths
        this.map.on('mouseenter', pathsLayerKey, () => {
            this.map.getCanvasContainer().style.cursor = 'pointer'
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

        // if mouse leaves alternative paths
        this.map.on('mouseleave', pathsLayerKey, () => {
            this.map.getCanvasContainer().style.cursor = ''
        })

        const handler = new LongTouchHandler(e => this.popup.show(e.lngLat))

        // handle long touches to open pop up
        this.map.on('touchstart', e => handler.onTouchStart(e))
        this.map.on('touchend', () => handler.onTouchEnd())
        this.map.on('touchmove', () => handler.onTouchEnd())
    }

    remove() {
        if (!this.isRemoved) {
            this.isRemoved = true
            this.map.remove()
        }
    }

    drawPaths(paths: Path[], selectedPath: Path) {
        this.currentPaths = paths
            .map((path, i) => {
                return {
                    path: path,
                    index: i
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
                    geometry: path.points as LineString
                }
            ]
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
                        index: indexPath.index
                    },
                    geometry: indexPath.path.points as LineString
                }
            })
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
                    type: 'FeatureCollection'
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
                    draggable: true
                })
                    .setLngLat(indexPoint.point.coordinate)
                    .on('dragend', (e: { type: string; target: Marker }) => {
                        const marker = e.target
                        Dispatcher.dispatch(
                            new SetPoint({
                                ...indexPoint.point,
                                coordinate: marker.getLngLat(),
                                queryText: coordinateToText(marker.getLngLat())
                            })
                        )
                    })
            )
        this.markers.forEach(marker => marker.addTo(this.map))
    }

    drawPathDetailMarker(point: PathDetailsPoint | null) {
        if (this.pathDetailsMarker) {
            this.pathDetailsMarker.remove()
            this.pathDetailsMarker = null
        }

        if (point) {
            this.pathDetailsMarker = new Marker({
                element: createMapMarker(point.elevation, point.description),
                anchor: 'bottom-left',
                offset: new Point(-5, 5)
            })
                .setLngLat(point.point)
                .addTo(this.map)
        }
    }

    highlightPathSegments(segments: Coordinate[][]) {
        const featureCollection: FeatureCollection = {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'MultiLineString',
                        coordinates: segments.map(s => s.map(c => [c.lng, c.lat]))
                    },
                    properties: {}
                }
            ]
        }

        this.setGeoJsonSource(highlightedPathSegmentSourceKey, featureCollection)
    }

    fitBounds(bbox: Bbox) {
        if (bbox.every(num => num !== 0)) {
            this.map.fitBounds(new LngLatBounds(bbox), {
                padding: Mapbox.getPadding(),
                duration: 500,
                animate: !this.isFirstBounds
            })
            if (this.isFirstBounds) this.isFirstBounds = false
        }
    }

    resize() {
        this.map.resize()
    }

    private initLineLayers() {
        const source: GeoJSONSourceRaw = {
            type: 'geojson',
            data: {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'Point',
                    coordinates: []
                }
            }
        }

        const pathsLayer: LineLayer = {
            id: pathsLayerKey,
            type: 'line',
            source: pathsSourceKey,
            layout: {
                'line-join': 'round',
                'line-cap': 'round'
            },
            paint: {
                'line-color': '#5B616A',
                'line-width': 6,
                'line-opacity': 0.8
            }
        }

        this.map.addSource(pathsSourceKey, source)
        this.map.addLayer(pathsLayer)

        this.map.addSource(selectedPathSourceKey, source)
        this.map.addLayer({
            ...pathsLayer,
            id: selectedPathLayerKey,
            source: selectedPathSourceKey,
            paint: {
                'line-color': '#275DAD',
                'line-width': 8
            }
        })

        this.map.addSource(highlightedPathSegmentSourceKey, source)
        this.map.addLayer({
            ...pathsLayer,
            id: highlightedPathSegmentLayerKey,
            source: highlightedPathSegmentSourceKey,
            paint: {
                // todo
                'line-color': 'red',
                'line-width': 4
            }
        })
    }

    private static getPadding() {
        return mediaQuery.matches
            ? { top: 250, bottom: 150, right: 16, left: 16 }
            : {
                top: 100,
                bottom: 100,
                right: 100,
                left: 500
            }
    }

    private static getStyle(styleOption: StyleOption): string | Style {
        if (this.isVectorStyle(styleOption)) {
            return styleOption.url
        }

        const rasterStyle = styleOption as RasterStyle
        return {
            version: 8,
            sources: {
                'raster-source': {
                    type: 'raster',
                    tiles: rasterStyle.url,
                    attribution: rasterStyle.attribution,
                    tileSize: 256,
                    maxzoom: rasterStyle.maxZoom ? styleOption.maxZoom : 22
                }
            },
            layers: [
                {
                    id: 'raster-layer',
                    type: 'raster',
                    source: 'raster-source'
                }
            ]
        }
    }

    private static isVectorStyle(styleOption: StyleOption): styleOption is VectorStyle {
        return styleOption.type === 'vector'
    }
}

class LongTouchHandler {
    private callback: (e: MapTouchEvent) => void
    private currentTimeout: number = 0
    private currentEvent?: MapTouchEvent

    constructor(onLongTouch: (e: MapTouchEvent) => void) {
        this.callback = onLongTouch
    }

    onTouchStart(e: MapTouchEvent) {
        this.currentEvent = e
        this.currentTimeout = window.setTimeout(() => {
            console.log('long touch')
            if (this.currentEvent) this.callback(this.currentEvent)
        }, 500)
    }

    onTouchEnd() {
        console.log('touch end')
        window.clearTimeout(this.currentTimeout)
        this.currentEvent = undefined
    }
}
