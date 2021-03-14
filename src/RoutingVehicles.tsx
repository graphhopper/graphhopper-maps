import { RoutingVehicle } from '@/routing/Api'
import React from 'react'
import styles from './RoutingVehicles.modules.css'
import Dispatcher from '@/stores/Dispatcher'
import { SetVehicle } from '@/actions/Actions'

export default function ({
    routingVehicles,
    selectedVehicle,
}: {
    routingVehicles: RoutingVehicle[]
    selectedVehicle: RoutingVehicle
}) {
    return (
        <select
            className={styles.vehicleSelect}
            value={getEmoji(selectedVehicle)}
            onChange={e => {
                const selectedIndex = e.target.selectedIndex
                const routingVehicle = routingVehicles[selectedIndex]
                Dispatcher.dispatch(new SetVehicle(routingVehicle))
            }}
        >
            {routingVehicles.map(vehicle => (
                <option key={vehicle.key}>{getEmoji(vehicle)}</option>
            ))}
        </select>
    )
}

function getEmoji(vehicle: RoutingVehicle) {
    switch (vehicle.key) {
        case 'car':
            return '🚗\u00a0Car'
        case 'small_truck':
            return '🚐\u00a0Small Truck'
        case 'truck':
            return '🚛\u00a0Truck'
        case 'scooter':
            return '🛵\u00a0Scooter'
        case 'foot':
            return '🚶‍♀\u00a0\u00a0\u00a0Foot'
        case 'hike':
            return '🥾\u00a0Hike'
        case 'bike':
            return '🚲\u00a0Bike'
        case 'mtb':
            return '🚵‍♂\u00a0Mountain Bike'
        case 'racingbike':
            return '🚴‍♀\u00a0Racing Bike'
        default:
            return ''
    }
}
