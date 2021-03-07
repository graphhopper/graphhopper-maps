import { Path } from '@/routing/Api'
import { QueryPoint } from '@/stores/QueryStore'
import React, { useEffect, useRef, useState } from 'react'
import styles from '@/Map.module.css'
import Mapbox from '@/Mapbox'

type ComponentWithClassProps = {
    path: Path
    queryPoints: QueryPoint[]
    bbox: [number, number, number, number]
}

export default function ({ path, queryPoints, bbox }: ComponentWithClassProps) {
    const mapContainerRef: React.RefObject<HTMLDivElement> = useRef(null)
    const [map, setMap] = useState<Mapbox | null>(null)

    useEffect(() => {
        const mapWrapper = new Mapbox(
            mapContainerRef.current!,
            () => {
                setMap(mapWrapper)
            },
            e => {
                console.log('onclick: ' + e.lngLat)
            }
        )
        return () => map?.remove()
    }, [])
    useEffect(() => map?.drawLine(path), [path, map])
    useEffect(() => map?.drawMarkers(queryPoints), [queryPoints, map])
    useEffect(() => map?.fitBounds(bbox), [bbox, map])

    return <div className={styles.map} ref={mapContainerRef} />
}
