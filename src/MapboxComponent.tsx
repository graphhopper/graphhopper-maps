// import mapbox like this instead of {Map} from 'mapbox-gl' because otherwise the app is missing some global mapbox state
import * as mapbox from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import React, { useEffect, useRef, useState } from 'react'
import styles from '@/MapComponent.module.css'
import { Path } from '@/routing/Api'
import { QueryPoint } from '@/stores/QueryStore'
import { GeoJSONSource, LngLatBounds, Marker } from 'mapbox-gl'
import { SetPoint } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'

const lineSourceKey = 'route'
const lineLayerKey = 'lines'

type MapboxProps = {
    path: Path
    queryPoints: QueryPoint[]
    bbox: [number, number, number, number]
}
export default function ({ path, queryPoints, bbox }: MapboxProps) {
    const mapContainerRef: React.RefObject<HTMLDivElement> = useRef(null)
    const [map, setMap] = useState<mapbox.Map | null>(null)
    const [mapReady, setMapReady] = useState<boolean>(false)
    const [markers, setMarkers] = useState<Marker[]>([])

    useEffect(
        () => {
            const map = new mapbox.Map({
                container: mapContainerRef.current!, // use bang here because we know that ref is set before
                accessToken:
                    'pk.eyJ1IjoiamFuZWtkZXJlcnN0ZSIsImEiOiJjajd1ZDB6a3A0dnYwMnFtamx6eWJzYW16In0.9vY7vIQAoOuPj7rg1A_pfw',
                style: 'mapbox://styles/mapbox/streets-v11',
            })

            map.on('load', () => {
                map.addSource(lineSourceKey, {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: [],
                        },
                    },
                })
                map.addLayer({
                    id: lineLayerKey,
                    type: 'line',
                    source: lineSourceKey,
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                    },
                    paint: {
                        'line-color': '#888',
                        'line-width': 8,
                    },
                })
                setMapReady(true)
            })

            setMap(map)

            return () => map.remove()
        },
        [] /* never update */
    )

    const drawRoute = function () {
        if (mapReady) {
            const source = map?.getSource(lineSourceKey) as GeoJSONSource

            if (path.points.coordinates.length > 0) {
                source.setData({
                    type: 'FeatureCollection',
                    features: [
                        {
                            type: 'Feature',
                            properties: {},
                            geometry: path.points as GeoJSON.LineString,
                        },
                    ],
                })
            } else {
                source.setData({
                    features: [],
                    type: 'FeatureCollection',
                })
            }
        }
    }
    const renderMarkers = function () {
        if (!mapReady) return

        markers.forEach(marker => marker.remove())
        const newMarkers = queryPoints
            .map((qp, i) => {
                return { index: i, queryPoint: qp }
            })
            .filter(indexPoint => indexPoint.queryPoint.isInitialized)
            .map(indexPoint =>
                new Marker({
                    color: indexPoint.queryPoint.color,
                    draggable: true,
                })
                    .setLngLat(indexPoint.queryPoint.coordinate)
                    .on('dragend', (e: { type: string; target: Marker }) => {
                        const marker = e.target
                        const coords = marker.getLngLat()
                        Dispatcher.dispatch(
                            new SetPoint(indexPoint.queryPoint.id, coords, indexPoint.queryPoint.queryText)
                        )
                    })
            )
        newMarkers.forEach(marker => marker.addTo(map!))
        setMarkers(newMarkers)
    }

    useEffect(drawRoute, [path, mapReady])
    useEffect(renderMarkers, [queryPoints, mapReady])
    useEffect(() => {
        if (bbox.every(num => num !== 0)) map?.fitBounds(new LngLatBounds(bbox))
    }, [bbox, mapReady])

    return <div className={styles.map} ref={mapContainerRef} />
}
