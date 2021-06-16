import ReactMapGL, { MapEvent } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Coordinate } from '@/stores/QueryStore'
import React from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { MapIsLoaded, SetViewport } from '@/actions/Actions'
import { RasterStyle, StyleOption, VectorStyle } from '@/stores/MapOptionsStore'
import { ViewportStoreState } from '@/stores/ViewportStore'
import { MapLayer } from '@/stores/MapLayerStore'

type MapProps = {
    viewport: ViewportStoreState
    mapStyle: StyleOption
    mapLayers: { [key: string]: MapLayer }
    setPopupCoordinate: (c: Coordinate | null) => void
}

export default function ({ viewport, mapStyle, mapLayers, setPopupCoordinate }: MapProps) {
    const longTouchHandler = new LongTouchHandler(e => setPopupCoordinate({ lng: e.lngLat[0], lat: e.lngLat[1] }))
    let interactiveLayerIds: string[] = []
    Object.values(mapLayers).forEach(l => {
        if (l.interactiveLayerIds) interactiveLayerIds = interactiveLayerIds.concat(l.interactiveLayerIds)
    })
    return (
        <ReactMapGL
            mapStyle={getStyle(mapStyle)}
            {...viewport}
            width="100%"
            height="100%"
            mapOptions={{
                // todo: maxBounds
                renderWorldCopies: false,
            }}
            onLoad={() => Dispatcher.dispatch(new MapIsLoaded())}
            onViewportChange={(nextViewport: ViewportStoreState) => {
                // close the context menu when we move the map
                setPopupCoordinate(null)
                Dispatcher.dispatch(new SetViewport(nextViewport))
            }}
            // todo: minor glitch: when we hover the map before the path got loaded we get an error in the console
            interactiveLayerIds={interactiveLayerIds}
            onClick={e => {
                const feature = e.features?.[0]
                if (feature) Object.values(mapLayers).forEach(l => l.onClick(feature))
            }}
            onContextMenu={e => {
                e.preventDefault()
                setPopupCoordinate({ lng: e.lngLat[0], lat: e.lngLat[1] })
            }}
            onTouchStart={e => longTouchHandler.onTouchStart(e)}
            onTouchEnd={() => longTouchHandler.onTouchEnd()}
            onTouchMove={() => longTouchHandler.onTouchEnd()}
        >
            {...Object.values(mapLayers).map(ml => ml.layer)}
        </ReactMapGL>
    )
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

function isVectorStyle(styleOption: StyleOption): styleOption is VectorStyle {
    return styleOption.type === 'vector'
}

class LongTouchHandler {
    private readonly callback: (e: MapEvent) => void
    private currentTimeout: number = 0
    private currentEvent?: MapEvent

    constructor(onLongTouch: (e: MapEvent) => void) {
        this.callback = onLongTouch
    }

    onTouchStart(e: MapEvent) {
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
