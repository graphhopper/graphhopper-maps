import { Map, Overlay } from 'ol'
import React, { useEffect, useRef, useState } from 'react'
import styles from '@/layers/MapFeaturePopup.module.css'
import { fromLonLat } from 'ol/proj'
import { useStore } from '@/stores/useStore'

interface MapFeaturePopupProps {
    map: Map
}

/**
 * The popup shown when certain map features are hovered. For example a road of the routing graph layer.
 */
export default function MapFeaturePopup({ map }: MapFeaturePopupProps) {
    const [overlay, setOverlay] = useState<Overlay | undefined>()
    const container = useRef<HTMLDivElement | null>()
    const point = useStore(state => state.point)
    const properties = useStore(state => state.properties)

    useEffect(() => {
        const overlay = new Overlay({
            element: container.current!,
            autoPan: false,
        })
        setOverlay(overlay)
        map.addOverlay(overlay)
    }, [map])

    useEffect(() => {
        overlay?.setPosition(point ? fromLonLat([point.lng, point.lat]) : undefined)
    }, [point])

    return (
        <div className={styles.popup} ref={container as any}>
            <ul>
                {Object.entries(properties).map(([k, v], index) => {
                    return <li key={index}>{`${k}=${v}`}</li>
                })}
            </ul>
        </div>
    )
}
