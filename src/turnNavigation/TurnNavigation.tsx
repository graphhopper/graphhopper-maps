import React from 'react'
import { Path, Instruction } from '@/api/graphhopper'
import { metersToText, milliSecondsToText } from '@/Converters'
import { getSignName } from '@/sidebar/instructions/Instructions'
import { getCurrentInstruction } from './GeoMethods'
import styles from '@/turnNavigation/TurnNavigation.module.css'
import endNavigation from '@/turnNavigation/end_turn_navigation.png'
import { getLocationStore } from '@/stores/Stores'
import { LocationStoreState } from '@/stores/LocationStore'

type TurnNavigationProps = {
    path: Path
    location: LocationStoreState
}

export default function ({ path, location }: TurnNavigationProps) {
    let currentLocation = location.coordinate
    if (currentLocation.lat == 0 && currentLocation.lng == 0) return <span>Searching GPS...</span>

    const { instructionIndex, distanceNext } = getCurrentInstruction(path.instructions, currentLocation)

    // TODO too far from route - recalculate?
    if (instructionIndex < 0) return <>Cannot find instruction</>

    const nextInstruction: Instruction = path.instructions[instructionIndex]

    // TODO better approximation via estimating taken time
    const arrivalDate = new Date()
    arrivalDate.setMilliseconds(arrivalDate.getSeconds() + path.time)
    const min = arrivalDate.getMinutes()
    return (
        <>
            <div>
                <div className={styles.turnInfo}>
                    <div className={styles.turnSign}>
                        <div>
                            <img src={getSignName(nextInstruction.sign, instructionIndex)} alt={'turn instruction'} />
                        </div>
                        <div>{metersToText(distanceNext)}</div>
                    </div>
                    <div className={styles.turnText}>{nextInstruction.text}</div>
                </div>
                <div className={styles.arrival}>
                    <div className={styles.arrival_date}>
                        {arrivalDate.getHours() + ':' + (min > 9 ? min : '0' + min)} Uhr
                    </div>
                    <div>{milliSecondsToText(path.time)}</div>
                    <div>{metersToText(path.distance)}</div>
                    <div onClick={() => getLocationStore().stop()}>
                        <img className={styles.navicon} src={endNavigation} />
                    </div>
                </div>
            </div>
        </>
    )
}
