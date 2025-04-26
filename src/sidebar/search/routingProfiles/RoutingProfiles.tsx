import React, {useEffect, useState} from 'react'
import styles from './RoutingProfiles.module.css'
import Dispatcher from '@/stores/Dispatcher'
import {SetVehicleProfile} from '@/actions/Actions'
import {RoutingProfile} from '@/api/graphhopper'
import PlainButton from '@/PlainButton'
import Chevron from './chevron.svg'
import {tr} from '@/translation/Translation'
import CustomModelBoxSVG from '@/sidebar/open_custom_model.svg'
import {icons} from '@/sidebar/search/routingProfiles/profileIcons'
import {ProfileGroup, ProfileGroupMap} from "@/stores/QueryStore";

export default function ({
                             routingProfiles,
                             profileGroupMapping,
                             selectedProfile,
                             showCustomModelBox,
                             toggleCustomModelBox,
                             customModelBoxEnabled,
                         }: {
    routingProfiles: RoutingProfile[]
    profileGroupMapping: Record<string, ProfileGroup>
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

    // Create a hash to count custom profiles to later enhance the base icon with a number.
    let customProfiles: Record<string, Array<string>> = {}

    // Now add the profiles to each key e.g. 'car_avoid_ferry' to the 'car_' key.
    // Create a special key '_' for profile names with an unknown icon.
    routingProfiles.forEach(p => {
        const key = (Object.keys(icons).find(k => p.name.startsWith(k + '_')) || '') + '_'
        if (!icons[p.name]) customProfiles[key] = [...(customProfiles[key] || []), p.name]
    })

    let profileToGroup = ProfileGroupMap.create(profileGroupMapping)
    return (
        <div className={styles.profilesParent}>
            <PlainButton
                title={tr('open_custom_model_box')}
                className={showCustomModelBox ? styles.enabledCMBox : styles.cmBox}
                onClick={toggleCustomModelBox}
            >
                <CustomModelBoxSVG/>
            </PlainButton>
            <div className={styles.carousel}>
                <PlainButton
                    className={styles.chevron}
                    title={tr('back')}
                    onClick={() => move(false)}
                    disabled={profileScroll <= 0}
                >
                    <Chevron/>
                </PlainButton>
                <ul className={styles.profiles} id="profiles_carousel_items" onScroll={onScroll}>
                    {routingProfiles.filter(profile => !profileToGroup[profile.name] || profile.name == profileToGroup[profile.name]).map(profile => {
                        const isProfileSelected =
                            profile.name === selectedProfile.name || profile.name == profileToGroup[selectedProfile.name]
                        const className = isProfileSelected
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
                                        <CustomModelBoxSVG className={styles.asIndicator}/>
                                    )}
                                    {getIcon(profile.name, customProfiles)}
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
                    <Chevron/>
                </PlainButton>
            </div>
        </div>
    )
}

function getIcon(profileName: string, customProfiles: Record<string, Array<string>>) {
    let icon = icons[profileName]
    if (icon) return React.createElement(icon)

    // go through every key in customProfiles and check if the profile is in the array under that key
    for (const [key, value] of Object.entries(customProfiles)) {
        const index = value.findIndex(p => p == profileName) + 1
        if (index >= 1) {
            let icon = icons[key.slice(0, -1)] // slice to remove underscore from key
            if (!icon) icon = icons.question_mark
            return key === '_' ? <NumberIcon number={index}/> : <IconWithBatchNumber baseIcon={icon} number={index}/>
        }
    }

    // this is the very last fallback, should never be reached
    return React.createElement(icons.question_mark)
}

function IconWithBatchNumber({baseIcon, number}: { baseIcon: any; number: number }) {
    return (
        <div className={styles.iconContainer}>
            {React.createElement(baseIcon)}
            <div className={styles.batchNumber}>
                <NumberIcon number={number}/>
            </div>
        </div>
    )
}

function NumberIcon({number}: { number: number }) {
    return <span>{number}</span>
}
