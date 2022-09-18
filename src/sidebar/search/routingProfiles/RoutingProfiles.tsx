import React from 'react'
import styles from './RoutingProfiles.modules.css'
import Dispatcher from '@/stores/Dispatcher'
import { SetVehicleProfile } from '@/actions/Actions'
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

export default function ({
    routingProfiles,
    selectedProfile,
}: {
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
}) {
    // this first merges profiles set from config and those received from the backend.
    const extraRoutingProfiles: RoutingProfile[] = config.extraProfiles
        ? Object.keys(config.extraProfiles).map(profile => ({ name: profile }))
        : []
    const allRoutingProfiles = routingProfiles.concat(extraRoutingProfiles)

    return (
        <ul className={styles.profiles}>
            {allRoutingProfiles.map(profile => {
                const className =
                    profile.name === selectedProfile.name
                        ? styles.selectedProfile + ' ' + styles.profileBtn
                        : styles.profileBtn

                return (
                    <li className={styles.profile} key={profile.name}>
                        <PlainButton
                            onClick={() => Dispatcher.dispatch(new SetVehicleProfile(profile))}
                            className={className}
                        >
                            {getIcon(profile)}
                        </PlainButton>
                    </li>
                )
            })}
        </ul>
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
