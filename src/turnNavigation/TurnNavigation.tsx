import React, { useState, useReducer, useEffect } from 'react'
import { Path, Instruction } from '@/api/graphhopper'
import { metersToText, milliSecondsToText } from '@/Converters'
import { getSignName } from '@/sidebar/instructions/Instructions'
import { getCurrentInstruction } from './GeoMethods'
import styles from '@/turnNavigation/TurnNavigation.module.css'
import endNavigation from '@/turnNavigation/end_turn_navigation.png'
import VolumeUpIcon from '@/turnNavigation/volume_up.svg'
import VolumeOffIcon from '@/turnNavigation/volume_off.svg'
import { getLocationStore } from '@/stores/Stores'
import { LocationStoreState } from '@/stores/LocationStore'
import PlainButton from '@/PlainButton'

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

    const [sound, setSound] = useState(true)
    // not sure how to access old state with useState alone
    function reducer(
        state: { distanceToNext: number; index: number },
        action: { distanceToNext: number; index: number }
    ) {
        return action
    }
    const [state, dispatch] = useReducer(reducer, { index: -1, distanceToNext: -1 })

    // after render if index changed and distance is close next instruction speak text out loud
    useEffect(() => {
        console.log(
            'useEffect',
            state,
            { index: instructionIndex, distanceToNext: distanceToNext },
            nextInstruction.text
        )
        dispatch({ index: instructionIndex, distanceToNext: distanceToNext })

        if (sound && distanceToNext < 40 && (state.distanceToNext > 40 || instructionIndex != state.index))
            getLocationStore().getSpeechSynthesizer().synthesize(nextInstruction.text)
    }, [instructionIndex, distanceToNext])

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
                    <div className={styles.turnInfoRightSide}>
                        <div className={styles.arrival}>
                            <PlainButton onClick={() => setSound(!sound)}>
                                {sound ? <VolumeUpIcon fill="#5b616a" /> : <VolumeOffIcon fill="#5b616a" />}
                            </PlainButton>
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
                        <div className={styles.turnText}>{nextInstruction.street_name}</div>
                    </div>
                </div>
            </div>
        </>
    )
}
