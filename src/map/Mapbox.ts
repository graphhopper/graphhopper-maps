import { GeoJSONSource, GeoJSONSourceRaw, LineLayer, LngLatBounds, Map, MapMouseEvent, Marker, Style } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { QueryPoint } from '@/stores/QueryStore'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint, SetSelectedPath } from '@/actions/Actions'
import { Popup } from '@/map/Popup'
import { FeatureCollection, LineString } from 'geojson'
import { Bbox, Path } from '@/api/graphhopper'
import { RasterStyle, StyleOption, VectorStyle } from '@/stores/MapOptionsStore'
import mapboxgl from 'mapbox-gl'
window.mapboxgl = mapboxgl
import { MapboxHeightGraph } from 'leaflet.heightgraph/example/MapboxHeightGraph'
import 'leaflet.heightgraph/src/heightgraph.css'

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
    private heightgraph = new MapboxHeightGraph()

    private mapIsReady = false
    private isFirstBounds = true
    private isRemoved = false

    constructor(
        container: HTMLDivElement,
        mapStyle: StyleOption,
        onMapReady: () => void,
        onClick: (e: MapMouseEvent) => void
    ) {
        this.map = new Map({
            container: container,
            accessToken:
                'pk.eyJ1IjoiamFuZWtkZXJlcnN0ZSIsImEiOiJjajd1ZDB6a3A0dnYwMnFtamx6eWJzYW16In0.9vY7vIQAoOuPj7rg1A_pfw',
            style: Mapbox.getStyle(mapStyle),
        })

        // add controls
        this.popup = new Popup(this.map)

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
                    index: i,
                }
            })
            .filter(indexPath => indexPath.path !== selectedPath)
        this.drawUnselectedPaths(this.currentPaths)
        this.drawSelectedPath(selectedPath)
    }

    showPathDetails(selectedPath: Path) {
        if (selectedPath.points.coordinates.length === 0) return
        if (!this.map.hasControl(this.heightgraph)) this.map.addControl(this.heightgraph, 'bottom-right')
        const elevation = Mapbox.createFeatureCollection('Elevation [m]', [
            Mapbox.createFeature(selectedPath.points.coordinates, 'elevation'),
        ])
        const pathDetails = Object.entries(selectedPath.details).map(([detailName, details]) => {
            const points = selectedPath.points.coordinates
            const features = details.map(([from, to, value = 'Undefined']: [number, number, string | number]) =>
                Mapbox.createFeature(points.slice(from, to + 1), value)
            )
            return Mapbox.createFeatureCollection(detailName, features)
        })
        const mappings: any = {
            'Elevation [m]': function () {
                return { text: 'Elevation [m]', color: '#27ce49' }
            },
        }
        Object.entries(selectedPath.details).forEach(([detailName, details]) => {
            mappings[detailName] = this.createColorMapping(details)
        })
        this.heightgraph.setData([elevation, ...pathDetails], mappings)
    }

    private static createFeature(coordinates: number[][], attributeType: number | string) {
        return {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: coordinates,
            },
            properties: {
                attributeType: attributeType,
            },
        }
    }

    private static createFeatureCollection(detailName: string, features: any[]) {
        return {
            type: 'FeatureCollection',
            features: features,
            properties: {
                summary: detailName,
                records: features.length,
            },
        }
    }

    private createColorMapping(detail: any): any {
        const detailInfo: any = Mapbox.inspectDetail(detail)
        if (detailInfo.numeric === true && detailInfo.minVal !== detailInfo.maxVal) {
            // for numeric details we use a color gradient, taken from here:  https://uigradients.com/#Superman
            const colorMin = [0, 153, 247]
            const colorMax = [241, 23, 18]
            return function (attributeType: number) {
                const factor = (attributeType - detailInfo.minVal) / (detailInfo.maxVal - detailInfo.minVal)
                const color = []
                for (let i = 0; i < 3; i++) color.push(colorMin[i] + factor * (colorMax[i] - colorMin[i]))
                return {
                    text: attributeType,
                    color: 'rgb(' + color[0] + ', ' + color[1] + ', ' + color[2] + ')',
                }
            }
        } else {
            // for discrete encoded values we use discrete colors
            const values = detail.map((d: any) => d[2])
            return function (attributeType: string) {
                // we choose a color-blind friendly palette from here: https://personal.sron.nl/~pault/#sec:qualitative
                // see also this: https://thenode.biologists.com/data-visualization-with-flying-colors/research/
                const palette = [
                    '#332288',
                    '#88ccee',
                    '#44aa99',
                    '#117733',
                    '#999933',
                    '#ddcc77',
                    '#cc6677',
                    '#882255',
                    '#aa4499',
                ]
                const missingColor = '#dddddd'
                const index = values.indexOf(attributeType) % palette.length
                const color =
                    attributeType === 'missing' || attributeType === 'unclassified' ? missingColor : palette[index]
                return {
                    text: attributeType,
                    color: color,
                }
            }
        }
    }

    static inspectDetail(detail: any) {
        // we check if all detail values are numeric
        const numbers = new Set()
        let minVal, maxVal
        let numberCount = 0
        for (let i = 0; i < detail.length; i++) {
            const val = detail[i][2]
            if (typeof val === 'number') {
                if (!minVal) minVal = val
                if (!maxVal) maxVal = val
                numbers.add(val)
                numberCount++
                minVal = Math.min(val, minVal)
                maxVal = Math.max(val, maxVal)
            }
        }
        return {
            numeric: numberCount === detail.length,
            minVal: minVal,
            maxVal: maxVal,
        }
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
        if (bbox.every(num => num !== 0)) {
            this.map.fitBounds(new LngLatBounds(bbox), {
                padding: Mapbox.getPadding(),
                duration: 500,
                animate: !this.isFirstBounds,
            })
            if (this.isFirstBounds) this.isFirstBounds = false
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
        this.map.addLayer(pathsLayer)

        this.map.addSource(selectedPathSourceKey, source)
        this.map.addLayer({
            ...pathsLayer,
            id: selectedPathLayerKey,
            source: selectedPathSourceKey,
            paint: {
                'line-color': '#275DAD',
                'line-width': 8,
            },
        })
    }

    private static getPadding() {
        return mediaQuery.matches
            ? { top: 400, bottom: 16, right: 16, left: 16 }
            : {
                  top: 100,
                  bottom: 100,
                  right: 100,
                  left: 500,
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
                    maxzoom: rasterStyle.maxZoom ? styleOption.maxZoom : 22,
                },
            },
            layers: [
                {
                    id: 'raster-layer',
                    type: 'raster',
                    source: 'raster-source',
                },
            ],
        }
    }

    private static isVectorStyle(styleOption: StyleOption): styleOption is VectorStyle {
        return styleOption.type === 'vector'
    }
}
