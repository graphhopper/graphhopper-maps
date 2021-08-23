import React from 'react'
import { Path, Instruction } from '@/api/graphhopper'
import { metersToText, milliSecondsToText } from '@/Converters'
import { getSignName } from '@/sidebar/instructions/Instructions'
import { getCurrentInstruction } from './GeoMethods'
import styles from '@/turnNavigation/TurnNavigation.module.css'
import endNavigation from '@/turnNavigation/end_turn_navigation.png'
import { getLocationStore } from '@/stores/Stores'
import { LocationStoreState } from '@/stores/LocationStore'
import { tr } from '@/translation/Translation'

type TurnNavigationProps = {
    path: Path
    location: LocationStoreState
}

export default function ({ path, location }: TurnNavigationProps) {
    let currentLocation = location.coordinate
    if (currentLocation.lat == 0 && currentLocation.lng == 0) return <span>Searching GPS...</span>

    const { instructionIndex, timeToNext, distanceToNext, remainingTime, remainingDistance } = getCurrentInstruction(
        path.instructions,
        currentLocation
    )

    console.log('remaining distance: ' + remainingDistance + ', time: ' + remainingTime)

    // TODO too far from route - recalculate?
    if (instructionIndex < 0) return <>Cannot find instruction</>

    const nextInstruction: Instruction = path.instructions[instructionIndex]

    // TODO better approximation via estimating taken time
    const arrivalDate = new Date()
    arrivalDate.setMilliseconds(arrivalDate.getSeconds() + remainingTime)
    const min = arrivalDate.getMinutes()
    return (
        <>
            <div>
                <div className={styles.turnInfo}>
                    <div className={styles.turnSign}>
                        <div>
                            <img src={getSignName(nextInstruction.sign, instructionIndex)} alt={'turn instruction'} />
                        </div>
                        <div>{metersToText(distanceToNext)}</div>
                    </div>
                    <div className={styles.arrival}>
                        <div>
                            <div className={styles.arrivalDuration}>{milliSecondsToText(remainingTime)}</div>
                            <div>{metersToText(remainingDistance)}</div>
                        </div>
                        <div className={styles.arrivalTime}>
                            {arrivalDate.getHours() + ':' + (min > 9 ? min : '0' + min)}
                        </div>
                        <div className={styles.endnavicon} onClick={() => getLocationStore().stop()}>
                            <img src={endNavigation} />
                        </div>
                    </div>
                </div>
                <div className={styles.turnText}>{nextInstruction.street_name}</div>
            </div>
        </>
    )
}
