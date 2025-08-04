import { Feature, Map } from 'ol'
import { useEffect, useRef, useState } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Point, Circle as CircleGeom } from 'ol/geom'
import { fromLonLat } from 'ol/proj'
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style'
import Geolocation from 'ol/Geolocation'

interface CurrentLocationState {
    enabled: boolean
    tracking: boolean
}

const LOCATION_LAYER_KEY = 'gh:current_location'

export default function useCurrentLocationLayer(map: Map, locationState: CurrentLocationState) {
    const geolocationRef = useRef<Geolocation | null>(null)
    const [hasPermission, setHasPermission] = useState<boolean | null>(null)

    useEffect(() => {
        if (!locationState.enabled) {
            removeCurrentLocationLayer(map)
            if (geolocationRef.current) {
                geolocationRef.current.setTracking(false)
                geolocationRef.current = null
            }
            return
        }

        // Check for geolocation permission
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'geolocation' }).then((result) => {
                setHasPermission(result.state === 'granted')
                result.addEventListener('change', () => {
                    setHasPermission(result.state === 'granted')
                })
            })
        }

        // Create geolocation instance
        const geolocation = new Geolocation({
            trackingOptions: {
                enableHighAccuracy: true
            },
            projection: map.getView().getProjection()
        })

        geolocationRef.current = geolocation

        // Create the location layer
        const locationLayer = createLocationLayer()
        map.addLayer(locationLayer)

        // Handle position updates
        const positionFeature = new Feature()
        const accuracyFeature = new Feature()

        geolocation.on('change:position', () => {
            const coordinates = geolocation.getPosition()
            if (coordinates) {
                positionFeature.setGeometry(new Point(coordinates))
                
                // Update view if tracking is enabled
                if (locationState.tracking) {
                    map.getView().animate({
                        center: coordinates,
                        duration: 500
                    })
                }
            }
        })

        geolocation.on('change:accuracyGeometry', () => {
            const accuracy = geolocation.getAccuracyGeometry()
            if (accuracy) {
                accuracyFeature.setGeometry(accuracy)
            }
        })

        geolocation.on('error', (error) => {
            console.error('Geolocation error:', error)
            setHasPermission(false)
        })

        // Add features to the layer
        const source = locationLayer.getSource()
        if (source) {
            source.addFeature(accuracyFeature)
            source.addFeature(positionFeature)
        }

        // Start tracking
        geolocation.setTracking(true)

        return () => {
            geolocation.setTracking(false)
            removeCurrentLocationLayer(map)
        }
    }, [map, locationState.enabled, locationState.tracking])

    return hasPermission
}

function removeCurrentLocationLayer(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(LOCATION_LAYER_KEY))
        .forEach(l => map.removeLayer(l))
}

function createLocationLayer(): VectorLayer<VectorSource> {
    const layer = new VectorLayer({
        source: new VectorSource(),
        style: (feature) => {
            const geometry = feature.getGeometry()
            if (geometry instanceof Point) {
                // Blue dot style for position
                return [
                    new Style({
                        image: new CircleStyle({
                            radius: 8,
                            fill: new Fill({
                                color: '#4285F4'
                            }),
                            stroke: new Stroke({
                                color: '#FFFFFF',
                                width: 2
                            })
                        })
                    }),
                    // Pulsing effect outer ring
                    new Style({
                        image: new CircleStyle({
                            radius: 16,
                            fill: new Fill({
                                color: 'rgba(66, 133, 244, 0.2)'
                            })
                        })
                    })
                ]
            } else if (geometry instanceof CircleGeom) {
                // Accuracy circle style
                return new Style({
                    fill: new Fill({
                        color: 'rgba(66, 133, 244, 0.1)'
                    }),
                    stroke: new Stroke({
                        color: 'rgba(66, 133, 244, 0.3)',
                        width: 1
                    })
                })
            }
            return []
        }
    })
    
    layer.set(LOCATION_LAYER_KEY, true)
    layer.setZIndex(4) // Above paths and query points
    
    return layer
}