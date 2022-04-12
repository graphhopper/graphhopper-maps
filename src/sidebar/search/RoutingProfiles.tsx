import React from 'react'
import styles from './RoutingProfiles.modules.css'
import Dispatcher from '@/stores/Dispatcher'
import { SetVehicleProfile } from '@/actions/Actions'
import { RoutingProfile } from '@/api/graphhopper'
import { tr } from '@/translation/Translation'
import * as config from 'config'

export default function ({
    routingProfiles,
    selectedProfile,
}: {
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
}) {
    console.log('selected profile is: ' + selectedProfile.name)

    const extraRoutingProfiles: RoutingProfile[] = config.extraProfiles
        ? Object.keys(config.extraProfiles).map(profile => ({ name: profile }))
        : []
    const b = routingProfiles.concat(extraRoutingProfiles)
    const allRoutingProfiles = b.find(profile => profile.name === selectedProfile.name)
        ? b
        : b.concat([selectedProfile])

    return (
        <select
            className={styles.profileSelect}
            value={getEmoji(selectedProfile) + '\u00a0' + tr(selectedProfile.name)}
            onChange={e => {
                const selectedIndex = e.target.selectedIndex
                const routingProfile = allRoutingProfiles[selectedIndex]
                Dispatcher.dispatch(new SetVehicleProfile(routingProfile))
            }}
        >
            {allRoutingProfiles.map(profile => (
                <option key={profile.name}>{getEmoji(profile) + '\u00a0' + tr(profile.name)}</option>
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
            return '🚩'
    }
}
