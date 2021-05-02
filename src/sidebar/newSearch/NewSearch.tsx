import React from 'react'
import { QueryPoint } from '@/stores/QueryStore'
import { RoutingVehicle } from '@/api/graphhopper'
import styles from './NewSearch.module.css'
export default function NewSearch({
    points,
    routingVehicles,
    selectedVehicle,
    onFocus,
}: {
    points: QueryPoint[]
    routingVehicles: RoutingVehicle[]
    selectedVehicle: RoutingVehicle
    onFocus: (point: QueryPoint) => void
}) {
    return (
        <div className={styles.search}>
            {points.map(point => (
                <input type="text" onFocus={() => onFocus(point)} value={point.queryText} />
            ))}
        </div>
    )
}
