import React from 'react'
import styles from './RoutingProfiles.modules.css'
import Dispatcher from '@/stores/Dispatcher'
import { SetVehicleProfile } from '@/actions/Actions'
import { RoutingProfile } from '@/api/graphhopper'
import { getTranslation } from '@/translation/Translation'
let t = getTranslation()

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
            value={getEmoji(selectedProfile) + '\u00a0' + t.get(selectedProfile.name)}
            onChange={e => {
                const selectedIndex = e.target.selectedIndex
                const routingProfile = routingProfiles[selectedIndex]
                Dispatcher.dispatch(new SetVehicleProfile(routingProfile))
            }}
        >
            {routingProfiles.map(profile => (
                <option key={profile.name}>{getEmoji(profile) + '\u00a0' + t.get(profile.name)}</option>
            ))}
        </select>
    )
}

function getEmoji(profile: RoutingProfile) {
    switch (profile.name) {
        case 'car':
            return '🚗'
        case 'small_truck':
            return '🚐'
        case 'truck':
            return '🚛'
        case 'scooter':
            return '🛵'
        case 'foot':
            return '🚶‍'
        case 'hike':
            return '🥾'
        case 'bike':
            return '🚲'
        case 'mtb':
            return '🚵‍'
        case 'racingbike':
            return '🚴‍'
        default:
            return ''
    }
}
