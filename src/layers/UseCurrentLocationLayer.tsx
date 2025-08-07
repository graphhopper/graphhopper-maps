import { Feature, Map } from 'ol'
import { useEffect, useRef } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Circle as CircleGeom, Point } from 'ol/geom'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import { CurrentLocationStoreState } from '@/stores/CurrentLocationStore'
import { fromLonLat } from 'ol/proj'
import { getMap } from '@/map/map'
import Dispatcher from '@/stores/Dispatcher'

const LOCATION_LAYER_KEY = 'gh:current_location'

export default function useCurrentLocationLayer(map: Map, locationState: CurrentLocationStoreState) {
    useEffect(() => {
        console.log('NOW useEffect, syncView = ', locationState.syncView)

        if (!locationState.enabled) {
            removeCurrentLocationLayer(map)
            return
        }

        const positionFeature = new Feature()
        if (locationState.coordinate) {
            positionFeature.setGeometry(
                new Point(fromLonLat([locationState.coordinate.lng, locationState.coordinate.lat]))
            )

            if (locationState.syncView) {
                // TODO same code as for MoveMapToPoint action, but calling Dispatcher here is ugly
                let zoom = map.getView().getZoom()
                if (zoom == undefined || zoom < 8) zoom = 8
                map.getView().animate({
                    zoom: zoom,
                    center: fromLonLat([locationState.coordinate.lng, locationState.coordinate.lat]),
                    duration: 400,
                })
            }
        }

        const layer = createLocationLayer(positionFeature)
        map.addLayer(layer)

        return () => {
            map.removeLayer(layer)
        }
    }, [locationState.enabled, locationState.coordinate, locationState.syncView])
}

function removeCurrentLocationLayer(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(LOCATION_LAYER_KEY))
        .forEach(l => map.removeLayer(l))
}

function createLocationLayer(positionFeature: Feature): VectorLayer<VectorSource> {
    const layer = new VectorLayer({
        source: new VectorSource(),
        style: feature => {
            const geometry = feature.getGeometry()
            if (geometry instanceof Point) {
                // Blue dot style for position
                return [
                    new Style({
                        image: new CircleStyle({
                            radius: 8,
                            fill: new Fill({
                                color: '#4285F4',
                            }),
                            stroke: new Stroke({
                                color: '#FFFFFF',
                                width: 2,
                            }),
                        }),
                    }),
                    // Pulsing effect outer ring
                    // new Style({
                    //     image: new CircleStyle({
                    //         radius: 16,
                    //         fill: new Fill({
                    //             color: 'rgba(66, 133, 244, 0.2)'
                    //         })
                    //     })
                    // })
                ]
            } else if (geometry instanceof CircleGeom) {
                // Accuracy circle style
                // return new Style({
                //     fill: new Fill({
                //         color: 'rgba(66, 133, 244, 0.1)'
                //     }),
                //     stroke: new Stroke({
                //         color: 'rgba(66, 133, 244, 0.3)',
                //         width: 1
                //     })
                // })
            }
            return []
        },
    })

    layer.setZIndex(4) // Above paths and query points

    layer.getSource()?.addFeature(positionFeature)
    return layer
}
