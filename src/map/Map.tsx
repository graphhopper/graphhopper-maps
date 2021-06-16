import ReactMapGL, { MapEvent, Popup } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Coordinate, QueryPoint } from '@/stores/QueryStore'
import React, { useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { MapIsLoaded, SetViewport } from '@/actions/Actions'
import { RasterStyle, StyleOption, VectorStyle } from '@/stores/MapOptionsStore'
import { ViewportStoreState } from '@/stores/ViewportStore'
import { PopupComponent } from '@/map/Popup'
import { MapLayer } from '@/layers/MapLayer'

type MapProps = {
    viewport: ViewportStoreState
    queryPoints: QueryPoint[]
    mapStyle: StyleOption
    mapLayers: MapLayer[]
}

export default function ({ viewport, mapStyle, queryPoints, mapLayers }: MapProps) {
    const [popupCoordinate, setPopupCoordinate] = useState<Coordinate | null>(null)
    const longTouchHandler = new LongTouchHandler(e => setPopupCoordinate({ lng: e.lngLat[0], lat: e.lngLat[1] }))
    let interactiveLayerIds: string[] = []
    mapLayers.forEach(l => {
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
                if (feature) mapLayers.forEach(l => l.onClick(feature))
            }}
            onContextMenu={e => {
                e.preventDefault()
                setPopupCoordinate({ lng: e.lngLat[0], lat: e.lngLat[1] })
            }}
            onTouchStart={e => longTouchHandler.onTouchStart(e)}
            onTouchEnd={() => longTouchHandler.onTouchEnd()}
            onTouchMove={() => longTouchHandler.onTouchEnd()}
        >
            {popupCoordinate && (
                <Popup
                    longitude={popupCoordinate.lng}
                    latitude={popupCoordinate.lat}
                    closeOnClick={true}
                    closeButton={false}
                >
                    <PopupComponent
                        coordinate={popupCoordinate}
                        queryPoints={queryPoints}
                        onSelect={() => setPopupCoordinate(null)}
                    />
                </Popup>
            )}
            {...mapLayers.map(ml => ml.layer)}
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
