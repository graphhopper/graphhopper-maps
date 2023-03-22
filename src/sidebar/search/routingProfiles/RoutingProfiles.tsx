import React from 'react'
import styles from './RoutingProfiles.module.css'
import Dispatcher from '@/stores/Dispatcher'
import { SetVehicleProfile } from '@/actions/Actions'
import { RoutingProfile } from '@/api/graphhopper'
import PlainButton from '@/PlainButton'
import BicycleIcon from './bike.svg'
import CarIcon from './car.svg'
import FootIcon from './foot.svg'
import HikeIcon from './hike.svg'
import MotorcycleIcon from './motorcycle.svg'
import MtbBicycleIcon from './mtb-bicycle.svg'
import RacingbikeIcon from './racingbike.svg'
import ScooterIcon from './scooter.svg'
import SmallTruckIcon from './small_truck.svg'
import TruckIcon from './truck.svg'
import WheelchairIcon from './wheelchair.svg'
import { tr } from '@/translation/Translation'
import SettingsSVG from '@/sidebar/settings.svg'

export default function ({
    routingProfiles,
    selectedProfile,
    customModelEnabled,
    showSettings,
    openSettingsHandle,
}: {
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
    customModelEnabled: boolean
    showSettings: boolean
    openSettingsHandle: () => void
}) {
    return (
        <div className={styles.profilesParent}>
            <PlainButton
                title={tr('show_settings')}
                style={{ boxShadow: customModelEnabled ? '1px 1px gray' : '' }}
                className={showSettings ? styles.enabledSettings : styles.settings}
                onClick={openSettingsHandle}
            >
                <SettingsSVG />
            </PlainButton>
            <ul className={styles.profiles}>
                {routingProfiles.map(profile => {
                    const className =
                        profile.name === selectedProfile.name
                            ? styles.selectedProfile + ' ' + styles.profileBtn
                            : styles.profileBtn
                    return (
                        <li key={profile.name}>
                            <PlainButton
                                title={tr(profile.name)}
                                onClick={() => Dispatcher.dispatch(new SetVehicleProfile(profile))}
                                className={className}
                            >
                                {getIcon(profile)}
                            </PlainButton>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

function getIcon(profile: RoutingProfile) {
    switch (profile.name) {
        case 'car':
            return <CarIcon />
        case 'small_truck':
            return <SmallTruckIcon />
        case 'truck':
            return <TruckIcon />
        case 'scooter':
            return <ScooterIcon />
        case 'foot':
            return <FootIcon />
        case 'hike':
            return <HikeIcon />
        case 'bike':
            return <BicycleIcon />
        case 'mtb':
            return <MtbBicycleIcon />
        case 'racingbike':
            return <RacingbikeIcon />
        case 'motorcycle':
            return <MotorcycleIcon />
        case 'wheelchair':
            return <WheelchairIcon />
        default:
            return profile.name
    }
}
