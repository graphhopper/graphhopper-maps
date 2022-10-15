import React from 'react'
import styles from './RoutingProfiles.modules.css'
import Dispatcher from '@/stores/Dispatcher'
import {ClearRoute, DismissLastError, SetCustomModelBoxEnabled, SetVehicleProfile} from '@/actions/Actions'
import { RoutingProfile } from '@/api/graphhopper'
import * as config from 'config'
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
import SettingsSVG from "@/sidebar/settings.svg";

export default function ({
routingProfiles,
selectedProfile,
customModelAllowed,
customModelEnabled,
}: {
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
    customModelAllowed: boolean
    customModelEnabled: boolean
}) {
    // this first merges profiles set from config and those received from the backend.
    const extraRoutingProfiles: RoutingProfile[] = config.extraProfiles
        ? Object.keys(config.extraProfiles).map(profile => ({ name: profile }))
        : []
    const allRoutingProfiles = routingProfiles.concat(extraRoutingProfiles)

    return (
        <div className={styles.profilesParent}>
            {
                customModelAllowed && (
                    <PlainButton
                        title={tr('open_custom_model_box')}
                        className={customModelEnabled ? styles.enabledSettings : styles.settings}
                        onClick={() => {
                            if (customModelEnabled) Dispatcher.dispatch(new DismissLastError())
                            Dispatcher.dispatch(new ClearRoute())
                            Dispatcher.dispatch(new SetCustomModelBoxEnabled(!customModelEnabled))
                        }}
                    >
                        <SettingsSVG />
                    </PlainButton>
                )
            }
            <ul className={styles.profiles}>
                {allRoutingProfiles.map(profile => {
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
