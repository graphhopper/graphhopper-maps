import { coordinateToText } from '@/Converters'
import ReactMapGL, { Layer, Marker, Popup, Source, WebMercatorViewport } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Coordinate, QueryPoint } from '@/stores/QueryStore'
import React, { useEffect, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { MapIsLoaded, SetPoint, SetSelectedPath } from '@/actions/Actions'
import { Bbox, Path } from '@/api/graphhopper'
import { PathDetailsPoint } from '@/stores/PathDetailsStore'
import { RasterStyle, StyleOption, VectorStyle } from '@/stores/MapOptionsStore'
import { ViewState } from 'react-map-gl/dist/es6/mapbox/mapbox'
import { FeatureCollection, LineString } from 'geojson'
import { PopupComponent } from '@/map/Popup'

const pathsLayerKey = 'pathsLayer'
const selectedPathLayerKey = 'selectedPathLayer'
const highlightedPathSegmentLayerKey = 'highlightedPathSegmentLayer'

// have this right here for now. Not sure if this needs to be abstracted somewhere else
const mediaQuery = window.matchMedia('(max-width: 640px)')

type MapProps = {
    selectedPath: Path
    paths: Path[]
    queryPoints: QueryPoint[]
    bbox: Bbox
    mapStyle: StyleOption
    pathDetailPoint: PathDetailsPoint | null
    highlightedPathDetailSegments: Coordinate[][]
}

export default function({
                            selectedPath,
                            paths,
                            queryPoints,
                            bbox,
                            mapStyle,
                            pathDetailPoint,
                            highlightedPathDetailSegments
                        }: MapProps) {
    const [viewport, setViewport] = useState<ViewState>({
        // todo
        latitude: 37.7577,
        longitude: -122.4376,
        zoom: 8
    })
    const [popupCoordinate, setPopupCoordinate] = useState<Coordinate | null>(null)
    useEffect(() => {
        const bounds: [[number, number], [number, number]] = [[bbox[0], bbox[1]], [bbox[2], bbox[3]]]
        // todo: use actual width&height and prevent flicker
        setViewport(new WebMercatorViewport({ width: 800, height: 600 })
            .fitBounds(bounds, {
                padding: getPadding()
                // todo: smooth transition and isFirstBounds
                // duration: 500,
                // animate: !this.isFirstBounds
            }))
    }, [bbox])

    const currentPaths = paths
        .map((path, i) => {
            return {
                path,
                index: i
            }
        })
        .filter(indexPath => indexPath.path !== selectedPath)
    // todo: long touch handler
    // const handler = new LongTouchHandler(e => this.popup.show(e.lngLat));
    return <ReactMapGL
        mapStyle={getStyle(mapStyle)}
        {...viewport}
        width='100%'
        height='100%'
        mapOptions={{
            // todo: maxBounds
            renderWorldCopies: false
        }}
        onLoad={() => Dispatcher.dispatch(new MapIsLoaded())}
        onViewportChange={(nextViewport: any) => setViewport(nextViewport)}
        // todo: minor glitch: when we hover the map before the path got loaded we get an error in the console
        interactiveLayerIds={currentPaths.length === 0 ? [] : [pathsLayerKey]}
        onClick={(e) => {
            const feature = e.features?.[0]
            if (feature) {
                // select an alternative path if clicked
                if (feature.layer.id === pathsLayerKey) {
                    const index = feature.properties!.index
                    const path = currentPaths.find(indexPath => indexPath.index === index)
                    Dispatcher.dispatch(new SetSelectedPath(path!.path))
                }
            }
        }}
        onContextMenu={(e) => {
            e.preventDefault()
            setPopupCoordinate({ lng: e.lngLat[0], lat: e.lngLat[1] })
        }}
        // onTouchStart={handler.onTouchStart}
        // onTouchEnd={handler.onTouchEnd}
        // onTouchMove={handler.onTouchEnd}
    >
        {popupCoordinate && <Popup
            longitude={popupCoordinate.lng}
            latitude={popupCoordinate.lat}
            closeOnClick={true}
            closeButton={false}
            // todo
            // closeOnMove: true,
        >
            <PopupComponent
                coordinate={popupCoordinate}
                queryPoints={queryPoints}
                onSelect={() => setPopupCoordinate(null)} />
        </Popup>}
        {createQueryPointMarkers(queryPoints)}
        {pathDetailPoint && createPathDetailMarker(pathDetailPoint)}
        {createUnselectedPaths(currentPaths)}
        {createSelectedPath(selectedPath)}
        {createHighlightedPathSegments(highlightedPathDetailSegments)}
    </ReactMapGL>
}

function createSelectedPath(path: Path) {
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
    return <Source type={'geojson'} data={featureCollection}>
        <Layer
            id={selectedPathLayerKey}
            type={'line'}
            layout={{
                'line-join': 'round',
                'line-cap': 'round'
            }}
            paint={{
                'line-color': '#275DAD',
                'line-width': 8
            }}
        />
    </Source>
}

function createUnselectedPaths(indexPaths: { path: Path; index: number }[]) {
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
    return <Source type={'geojson'} data={featureCollection}>
        <Layer
            id={pathsLayerKey}
            type={'line'}
            layout={{
                'line-join': 'round',
                'line-cap': 'round'
            }}
            paint={{
                'line-color': '#5B616A',
                'line-width': 6,
                'line-opacity': 0.8
            }}

        />
    </Source>
}

function createQueryPointMarkers(queryPoints: QueryPoint[]) {
    // todo: use icon
    return queryPoints
        .map((point, i) => {
            return { index: i, point: point }
        })
        .filter(indexPoint => indexPoint.point.isInitialized)
        .map((indexPoint, i) =>
            <Marker
                key={i}
                longitude={indexPoint.point.coordinate.lng}
                latitude={indexPoint.point.coordinate.lat}
                draggable={true}
                onDragEnd={(e: any) => {
                    const coordinate = { lng: e.lngLat[0], lat: e.lngLat[1] }
                    Dispatcher.dispatch(
                        new SetPoint({
                            ...indexPoint.point,
                            coordinate,
                            queryText: coordinateToText(coordinate)
                        })
                    )
                }}
            >
                <div style={{ color: indexPoint.point.color }}>x</div>
            </Marker>
        )
}

function createPathDetailMarker(point: PathDetailsPoint) {
    // todo: use createMapMarker from heightgraph
    // {createMapMarker(point.elevation, point.description)}
    return <Marker
        longitude={point.point.lng}
        latitude={point.point.lat}
        offsetLeft={-5}
        offsetTop={5}
    >
        <div>elevation: {point.elevation}, description: {point.description}</div>
    </Marker>
}

function createHighlightedPathSegments(segments: Coordinate[][]) {
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

    return <Source type={'geojson'} data={featureCollection}>
        <Layer
            id={highlightedPathSegmentLayerKey}
            type={'line'}
            layout={{
                'line-join': 'round',
                'line-cap': 'round'
            }}
            paint={{
                // todo
                'line-color': 'red',
                'line-width': 4
            }}

        />
    </Source>
}

function getPadding() {
    return mediaQuery.matches
        ? { top: 250, bottom: 150, right: 16, left: 16 }
        : {
            top: 100,
            bottom: 100,
            right: 100,
            left: 500
        }
}

function getStyle(styleOption: StyleOption): any {
    if (isVectorStyle(styleOption)) {
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

function isVectorStyle(styleOption: StyleOption): styleOption is VectorStyle {
    return styleOption.type === 'vector'
}

/* todo
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
*/
