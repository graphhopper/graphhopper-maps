import React from 'react'
import styles from '@/layers/MapFeaturePopup.module.css'
import MapPopup from '@/layers/MapPopup'
import { Map } from 'ol'
import { Coordinate } from '@/stores/QueryStore'

interface MapFeaturePopupProps {
    map: Map
    properties: object
    coordinate: Coordinate | null
}

/**
 * The popup shown when certain map features are hovered. For example a road of the routing graph layer.
 */
export default function MapFeaturePopup({ map, properties, coordinate }: MapFeaturePopupProps) {
    return (
        <MapPopup map={map} coordinate={coordinate}>
            <div className={styles.popup}>
                <ul>
                    {Object.entries(properties).map(([k, v], index) => {
                        return <li key={index}>{`${k}=${v}`}</li>
                    })}
                </ul>
            </div>
        </MapPopup>
    )
}
