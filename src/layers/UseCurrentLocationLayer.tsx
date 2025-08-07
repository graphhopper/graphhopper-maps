import { Feature, Map } from 'ol'
import {useEffect, useRef} from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Circle, Circle as CircleGeom, Point } from 'ol/geom'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import { CurrentLocationStoreState } from '@/stores/CurrentLocationStore'
import { fromLonLat } from 'ol/proj'

const LOCATION_LAYER_KEY = 'gh:current_location'

export default function useCurrentLocationLayer(map: Map, locationState: CurrentLocationStoreState) {
    const layerRef = useRef<VectorLayer<VectorSource> | null>(null)
    const positionFeatureRef = useRef<Feature | null>(null)
    const accuracyFeatureRef = useRef<Feature | null>(null)

    // Create layer once when enabled
    useEffect(() => {
        if (!locationState.enabled) {
            if (layerRef.current) {
                map.removeLayer(layerRef.current)
                layerRef.current = null
                positionFeatureRef.current = null
                accuracyFeatureRef.current = null
            }
            return
        } else if (!layerRef.current) {
            const layer = createLocationLayer()
            const positionFeature = new Feature()
            const accuracyFeature = new Feature()
            layer.getSource()?.addFeature(positionFeature)
            layer.getSource()?.addFeature(accuracyFeature)
            map.addLayer(layer)

            layerRef.current = layer
            positionFeatureRef.current = positionFeature
            accuracyFeatureRef.current = accuracyFeature
        }

        return () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current)
                layerRef.current = null
                positionFeatureRef.current = null
                accuracyFeatureRef.current = null
            }
        }
    }, [locationState.enabled])

    useEffect(() => {
        if (!locationState.enabled || !locationState.coordinate || !positionFeatureRef.current || !accuracyFeatureRef.current) {
            return
        }

        const coord = fromLonLat([locationState.coordinate.lng, locationState.coordinate.lat])
        positionFeatureRef.current.setGeometry(new Point(coord))
        accuracyFeatureRef.current.setGeometry(new Circle(coord, locationState.accuracy))

        if (locationState.syncView) {
            // TODO same code as for MoveMapToPoint action, but calling Dispatcher here is ugly
            let zoom = map.getView().getZoom()
            if (zoom == undefined || zoom < 8) zoom = 8
            map.getView().animate({ zoom: zoom, center: coord, duration: 400 })
        }
    }, [locationState.coordinate, locationState.accuracy, locationState.syncView, locationState.enabled])
}

function createLocationLayer(): VectorLayer<VectorSource> {
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
                return new Style({
                    fill: new Fill({
                        color: 'rgba(66, 133, 244, 0.1)',
                    }),
                    stroke: new Stroke({
                        color: 'rgba(66, 133, 244, 0.3)',
                        width: 1,
                    }),
                })
            }
            return []
        },
    })

    layer.setZIndex(4) // Above paths and query points
    return layer
}
