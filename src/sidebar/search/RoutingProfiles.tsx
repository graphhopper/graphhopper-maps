import React from 'react'
import styles from './RoutingProfiles.modules.css'
import Dispatcher from '@/stores/Dispatcher'
import { SetVehicleProfile } from '@/actions/Actions'
import { RoutingProfile } from '@/api/graphhopper'

export default function ({
    routingProfiles,
    selectedProfile,
}: {
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
}) {
    return (
        <select
            className={styles.profileSelect}
            value={getEmoji(selectedProfile)}
            onChange={e => {
                const selectedIndex = e.target.selectedIndex
                const routingProfile = routingProfiles[selectedIndex]
                Dispatcher.dispatch(new SetVehicleProfile(routingProfile))
            }}
        >
            {routingProfiles.map(profile => (
                <option key={profile.name}>{getEmoji(profile)}</option>
            ))}
        </select>
    )
}

function getEmoji(profile: RoutingProfile) {
    switch (profile.name) {
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
