import { Feature, Map } from 'ol'
import { useEffect, useRef } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Circle, Circle as CircleGeom, Point } from 'ol/geom'
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style } from 'ol/style'
import { CurrentLocationStoreState } from '@/stores/CurrentLocationStore'
import { fromLonLat } from 'ol/proj'

export default function useCurrentLocationLayer(map: Map, locationState: CurrentLocationStoreState) {
    const layerRef = useRef<VectorLayer<VectorSource> | null>(null)
    const positionFeatureRef = useRef<Feature | null>(null)
    const accuracyFeatureRef = useRef<Feature | null>(null)
    const headingFeatureRef = useRef<Feature | null>(null)

    useEffect(() => {
        if (!locationState.enabled) {
            if (layerRef.current) {
                map.removeLayer(layerRef.current)
                layerRef.current = null
                positionFeatureRef.current = null
                accuracyFeatureRef.current = null
                headingFeatureRef.current = null
            }
            return
        } else if (!layerRef.current) {
            const layer = createLocationLayer()
            const positionFeature = new Feature()
            const accuracyFeature = new Feature()
            const headingFeature = new Feature()
            layer.getSource()?.addFeature(positionFeature)
            layer.getSource()?.addFeature(accuracyFeature)
            layer.getSource()?.addFeature(headingFeature)
            map.addLayer(layer)

            layerRef.current = layer
            positionFeatureRef.current = positionFeature
            accuracyFeatureRef.current = accuracyFeature
            headingFeatureRef.current = headingFeature
        }

        return () => {
            if (layerRef.current) {
                map.removeLayer(layerRef.current)
                layerRef.current = null
                positionFeatureRef.current = null
                accuracyFeatureRef.current = null
                headingFeatureRef.current = null
            }
        }
    }, [locationState.enabled])

    useEffect(() => {
        if (
            !locationState.enabled ||
            !locationState.coordinate ||
            !positionFeatureRef.current ||
            !accuracyFeatureRef.current ||
            !headingFeatureRef.current
        )
            return

        const coord = fromLonLat([locationState.coordinate.lng, locationState.coordinate.lat])
        positionFeatureRef.current.setGeometry(new Point(coord))
        accuracyFeatureRef.current.setGeometry(new Circle(coord, locationState.accuracy))

        // set heading feature position (style will handle the triangle and rotation)
        if (locationState.heading != null) {
            headingFeatureRef.current.setGeometry(new Point(coord))
            headingFeatureRef.current.set('heading', locationState.heading)
        } else {
            headingFeatureRef.current.setGeometry(undefined)
            headingFeatureRef.current.unset('heading') // not strictly necessary
        }

        if (locationState.syncView) {
            const currentZoom = map.getView().getZoom()
            const targetZoom = currentZoom == undefined || currentZoom < 16 ? 16 : currentZoom
            const zoomDifference = Math.abs(targetZoom - (currentZoom || 0))
            if (zoomDifference > 0.1) {
                map.getView().animate({ zoom: targetZoom, center: coord, duration: 400 })
            } else {
                // for smaller zoom changes set center without animation to avoid pulsing of map
                map.getView().setCenter(coord)
            }
        }
    }, [
        locationState.coordinate,
        locationState.accuracy,
        locationState.heading,
        locationState.syncView,
        locationState.enabled,
    ])
}

function createLocationLayer(): VectorLayer<VectorSource> {
    return new VectorLayer({
        source: new VectorSource(),
        style: feature => {
            const geometry = feature.getGeometry()
            if (geometry instanceof Point) {
                const heading = feature.get('heading')
                if (heading !== undefined) {
                    // triangle style for heading direction
                    return new Style({
                        image: new RegularShape({
                            points: 3,
                            radius: 8,
                            displacement: [0, 9],
                            rotation: (heading * Math.PI) / 180, // convert degrees to radians
                            fill: new Fill({ color: '#368fe8' }),
                            stroke: new Stroke({ color: '#FFFFFF', width: 1 }),
                        }),
                        zIndex: 1,
                    })
                } else {
                    // blue dot style for position
                    return new Style({
                        image: new CircleStyle({
                            radius: 8,
                            fill: new Fill({ color: '#368fe8' }),
                            stroke: new Stroke({ color: '#FFFFFF', width: 2 }),
                        }),
                        zIndex: 2, // above the others
                    })
                }
            } else if (geometry instanceof CircleGeom) {
                // accuracy circle style
                return new Style({
                    fill: new Fill({ color: 'rgba(66, 133, 244, 0.1)' }),
                    stroke: new Stroke({ color: 'rgba(66, 133, 244, 0.3)', width: 1 }),
                    zIndex: 0, // behind the others
                })
            }
            return []
        },
        zIndex: 4, // layer itself should be above paths and query points
    })
}
