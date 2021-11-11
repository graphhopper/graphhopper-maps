import styles from '@/map/Map.module.css'
import React, { useEffect, useRef } from 'react'
import { Map } from 'ol'

type MapComponentProps = {
    map: Map
}

export default function ({ map }: MapComponentProps) {
    const mapElement = useRef<any>()
    useEffect(() => {
        map.setTarget(mapElement.current)
    }, [map])
    return <div ref={mapElement} className={styles.mapContainer} />
}
