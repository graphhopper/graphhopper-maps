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
    const [profileScroll, setProfileScroll] = useState(0)
    const [profileWidth, setProfileWidth] = useState(0)

    function handleResize() {
        const profilesCarouselItems = document.getElementById('profiles_carousel_items')
        if (!profilesCarouselItems) return
        if (profilesCarouselItems.scrollWidth > profilesCarouselItems.clientWidth) {
            for (const chevron of document.getElementsByClassName(styles.chevron)) {
                chevron.classList.add(styles.enabled)
            }
            profilesCarouselItems.classList.remove(styles.profiles_center)
        } else {
            for (const chevron of document.getElementsByClassName(styles.chevron)) {
                chevron.classList.remove(styles.enabled)
            }
            profilesCarouselItems.classList.add(styles.profiles_center)
        }
        setProfileWidth(profilesCarouselItems.scrollWidth - profilesCarouselItems.clientWidth)
    }

    useEffect(() => {
        handleResize()
        // If the window is resized, we need to check if the chevrons should be enabled
        // and if the profiles should be centered
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [routingProfiles])

    function move(forward: boolean = true) {
        const profilesCarouselItems = document.getElementById('profiles_carousel_items')
        if (!profilesCarouselItems) return

        const scrollAmount = profilesCarouselItems.clientWidth * (forward ? 1 : -1)
        const limit = forward ? profileWidth - profileScroll : -profileScroll
        const scrollValue = forward ? Math.min(scrollAmount, limit) : Math.max(scrollAmount, limit)

        profilesCarouselItems.scrollBy({
            left: scrollValue,
            behavior: 'smooth',
        })
    }

    function onScroll() {
        const profilesCarouselItems = document.getElementById('profiles_carousel_items')
        if (!profilesCarouselItems) return
        setProfileScroll(profilesCarouselItems.scrollLeft)
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
                    title={tr('back')}
                    onClick={() => move(false)}
                    disabled={profileScroll <= 0}
                >
                    <Chevron />
                </PlainButton>
                <ul className={styles.profiles} id="profiles_carousel_items" onScroll={onScroll}>
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
                                    {getIcon(profile, routingProfiles)}
                                </PlainButton>
                            </li>
                        )
                    })}
                </ul>
                <PlainButton
                    className={styles.chevron + ' ' + styles.flip}
                    title={tr('next')}
                    onClick={() => move()}
                    disabled={profileScroll >= profileWidth}
                >
                    <Chevron />
                </PlainButton>
            </div>
        </div>
    )
}

// type any is needed to read the icon property, which is not part of the RoutingProfile type,
// but was injected in QueryStore.ts
function getIcon(profile: any, profiles: any[]) {
    // ALL AVAILABLE ICONS
    // every svg gets mapped to a key, so icons can be easily added
    // in the config file: use a key like "car", "small_truck", ...
    const icons = {
        car: CarIcon,
        small_truck: SmallTruckIcon,
        truck: TruckIcon,
        scooter: ScooterIcon,
        foot: FootIcon,
        hike: HikeIcon,
        bike: BicycleIcon,
        mtb: MtbBicycleIcon, // Mountainbike
        racingbike: RacingbikeIcon,
        motorcycle: MotorcycleIcon,
        wheelchair: WheelchairIcon,
        question_mark: QuestionMarkIcon,
    }

    // this gets the index of the profile in the list of profiles without an icon, used to display the fallback number icon
    const index = profiles.filter((p) => p.icon == undefined && !Object.keys(icons).includes(p.name)).findIndex((p) => p.name === profile.name) + 1
    const i = profile.icon !== undefined ? profile.icon : profile.name

    // if the icon is not in the list of icons, the fallback number icon is displayed, otherwise the svg from the icons map gets rendered
    return Object.keys(icons).includes(i) ? React.createElement(Object.entries(icons).find(([key]) => key === i)![1]) : <NumberIcon number={index} />
}

function NumberIcon({ number }: { number: number }) {
    return <span>{number}</span>
}
