import React, { useEffect, useState } from 'react'
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
import QuestionMarkIcon from './question_mark.svg'
import Chevron from './chevron.svg'
import { tr } from '@/translation/Translation'
import CustomModelBoxSVG from '@/sidebar/open_custom_model.svg'

export default function ({
    routingProfiles,
    selectedProfile,
    showCustomModelBox,
    toggleCustomModelBox,
    customModelBoxEnabled,
}: {
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
    showCustomModelBox: boolean
    toggleCustomModelBox: () => void
    customModelBoxEnabled: boolean
}) {
    const [profileShowIndex, setProfileShowIndex] = useState(1)

    useEffect(() => {
        console.log('profileShowIndex', profileShowIndex)
    }, [profileShowIndex])

    function move(amount: number) {
        const index = profileShowIndex + amount
        const profilesCarouselItems = document.getElementById('profiles_carousel_items')
        if (!profilesCarouselItems) return
        profilesCarouselItems.scrollBy({
            left: profilesCarouselItems.clientWidth * index - profilesCarouselItems.clientWidth * profileShowIndex,
            behavior: 'smooth',
        })
        setProfileShowIndex(index)
    }

    function maxIndex() {
        const profilesCarouselItems = document.getElementById('profiles_carousel_items')
        if (!profilesCarouselItems) return 1
        return Math.round(profilesCarouselItems.scrollWidth / profilesCarouselItems.clientWidth)
    }

    return (
        <div className={styles.profilesParent}>
            <PlainButton
                title={tr('open_custom_model_box')}
                className={showCustomModelBox ? styles.enabledCMBox : styles.cmBox}
                onClick={toggleCustomModelBox}
            >
                <CustomModelBoxSVG />
            </PlainButton>
            <div className={styles.carousel}>
                <PlainButton
                    className={styles.chevron}
                    title="go left"
                    onClick={() => move(-1)}
                    disabled={profileShowIndex === 1}
                >
                    <Chevron />
                </PlainButton>
                <ul className={styles.profiles} id="profiles_carousel_items">
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
                                    {customModelBoxEnabled && profile.name === selectedProfile.name && (
                                        <CustomModelBoxSVG className={styles.asIndicator} />
                                    )}
                                    {getIcon(profile)}
                                </PlainButton>
                            </li>
                        )
                    })}
                </ul>
                <PlainButton
                    className={styles.chevron + ' ' + styles.flip}
                    title="go right"
                    onClick={() => move(1)}
                    disabled={profileShowIndex === maxIndex()}
                >
                    <Chevron />
                </PlainButton>
            </div>
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
            return <QuestionMarkIcon />
    }
}
