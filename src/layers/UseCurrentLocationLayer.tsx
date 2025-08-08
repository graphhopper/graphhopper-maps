import { Feature, Map } from 'ol'
import { useEffect, useRef, useState } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Point, Circle as CircleGeom } from 'ol/geom'
import { fromLonLat } from 'ol/proj'
import { Style, Fill, Stroke, Circle as CircleStyle, RegularShape } from 'ol/style'
import Geolocation from 'ol/Geolocation'

interface CurrentLocationState {
    enabled: boolean
    tracking?: boolean // Make optional to match your existing state
    showDirection?: boolean // New option for showing direction
}

const LOCATION_LAYER_KEY = 'gh:current_location'

export default function useCurrentLocationLayer(map: Map, locationState: CurrentLocationState) {
    const geolocationRef = useRef<Geolocation | null>(null)
    const [hasPermission, setHasPermission] = useState<boolean | null>(null)
    const [deviceHeading, setDeviceHeading] = useState<number | null>(null)
    const orientationPermissionRef = useRef<boolean>(false)

    // Request device orientation permission (iOS 13+)
    const requestOrientationPermission = async () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const permission = await (DeviceOrientationEvent as any).requestPermission()
                orientationPermissionRef.current = permission === 'granted'
                return permission === 'granted'
            } catch (error) {
                console.error('Error requesting device orientation permission:', error)
                return false
            }
        } else {
            // Non-iOS devices or older iOS versions
            orientationPermissionRef.current = true
            return true
        }
    }

    // Handle device orientation
    useEffect(() => {
        if (!locationState.enabled || !locationState.showDirection) {
            return
        }

        const handleOrientation = (event: DeviceOrientationEvent) => {
            if (event.alpha !== null) {
                // Convert to compass heading (0 = North, 90 = East, etc.)
                let heading = event.alpha

                // Adjust for different browsers/devices if needed
                // Some devices may need calibration adjustments
                setDeviceHeading(heading)
            }
        }

        const setupOrientation = async () => {
            const hasPermission = await requestOrientationPermission()
            if (hasPermission) {
                window.addEventListener('deviceorientation', handleOrientation)
            }
        }

        setupOrientation()

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation)
        }
    }, [locationState.enabled, locationState.showDirection])

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
        const locationLayer = createLocationLayer(deviceHeading, locationState.showDirection)
        map.addLayer(locationLayer)

        // Create features
        const positionFeature = new Feature()
        const accuracyFeature = new Feature()
        const directionFeature = new Feature() // New feature for direction indicator

        // Set feature types for styling
        positionFeature.set('featureType', 'position')
        accuracyFeature.set('featureType', 'accuracy')
        directionFeature.set('featureType', 'direction')

        geolocation.on('change:position', () => {
            const coordinates = geolocation.getPosition()
            if (coordinates) {
                positionFeature.setGeometry(new Point(coordinates))

                // Update direction feature position
                if (locationState.showDirection) {
                    directionFeature.setGeometry(new Point(coordinates))
                }

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
            if (locationState.showDirection) {
                source.addFeature(directionFeature)
            }
        }

        // Start tracking
        geolocation.setTracking(true)

        return () => {
            geolocation.setTracking(false)
            removeCurrentLocationLayer(map)
        }
    }, [map, locationState.enabled, locationState.tracking, locationState.showDirection, deviceHeading])

    return hasPermission
}

function removeCurrentLocationLayer(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(LOCATION_LAYER_KEY))
        .forEach(l => map.removeLayer(l))
}

function createLocationLayer(heading: number | null, showDirection?: boolean): VectorLayer<VectorSource> {
    const layer = new VectorLayer({
        source: new VectorSource(),
        style: (feature) => {
            const featureType = feature.get('featureType')
            const geometry = feature.getGeometry()

            if (featureType === 'position' && geometry instanceof Point) {
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
            } else if (featureType === 'direction' && geometry instanceof Point && showDirection && heading !== null) {
                // Direction indicator (triangle/arrow pointing in heading direction)
                return new Style({
                    image: new RegularShape({
                        points: 3,
                        radius: 12,
                        rotation: (heading * Math.PI) / 180, // Convert degrees to radians
                        fill: new Fill({
                            color: '#4285F4'
                        }),
                        stroke: new Stroke({
                            color: '#FFFFFF',
                            width: 2
                        })
                    })
                })
            } else if (featureType === 'accuracy' && geometry instanceof CircleGeom) {
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