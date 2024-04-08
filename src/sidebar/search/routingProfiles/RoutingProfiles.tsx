import React, { ReactElement, useEffect, useState } from 'react'
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

    // this maps the profile names to the icons, so the correct icon can be displayed
    // this is used to count the profiles of a specific icon, so the fallback number icon can be displayed with a base icon
    // see #376 for more details
    let profileMap: Record<string, Array<any>> = {};
    routingProfiles.forEach((p) => {
        // find the key in the icons object, which matches the profile name with the following rules
        // 1. the profile name is equal to the key
        // 2. the profile name starts with the key and is followed by an underscore
        const key = Object.keys(icons).find(k => p.name === k || p.name.startsWith(k + "_")) || "";

        // if the key is found, the profile name gets added to the array of the key, otherwise it gets added to an empty string
        profileMap[key] = [...(profileMap[key] || []), p];
    });

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
                                    {getIcon(profile, profileMap)}
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
function getIcon(profile: any, profiles: Record<string, Array<any>>) {
    if(profile.icon) {
        return Object.keys(icons).includes(profile.icon) ? React.createElement(Object.entries(icons).find(([key]) => key === profile.icon)![1]) : React.createElement(icons.question_mark);
    }

    // if the profile name is in the profileMap, the icon of the profile gets displayed
    // otherwise the fallback number icon gets displayed with the base icon
    if(profiles[profile.name]) {
        return React.createElement(Object.entries(icons).find(([key]) => key === profile.name)![1]);
    }

    // go through every key in the profiles map and check if the profile name is in the array under that key
    // if the key is not "", return a IconWithBatchNumber with the base icon of the key and a number (index of the profile in the array)
    // if the key is "", return a NumberIcon with the index of the profile in the array
    for(const [key, value] of Object.entries(profiles)) {
        if(value.some((p) => p.name === profile.name)) {
            const icon = Object.keys(icons).includes(key) ? Object.entries(icons).find(([k]) => k === key)![1] : icons.question_mark;
            const index = key === "" ? value.findIndex((p) => p.name == profile.name) + 1 : value.findIndex((p) => p.name == profile.name);
            return key === "" ? <NumberIcon number={index} /> : <IconWithBatchNumber baseIcon={icon} number={index} />;
        }
    }

    // this is the very last fallback, should never be reached
    return React.createElement(icons.question_mark);
}

function IconWithBatchNumber({baseIcon, number}: {baseIcon: any, number: number}) {
    return (
        <div className={styles.iconContainer}>
            {React.createElement(baseIcon)}
            <div className={styles.batchNumber}>
                <NumberIcon number={number} />
            </div>
        </div>
    )

}

function NumberIcon({ number }: { number: number }) {
    return <span>{number}</span>
}
