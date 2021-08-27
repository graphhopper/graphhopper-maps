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
        state: { distanceToNext: number; index: number; text: string },
        action: { distanceToNext: number; index: number; text: string }
    ) {
        return action
    }
    const [state, dispatch] = useReducer(reducer, { index: -1, distanceToNext: -1, text: '' })

    // speak text out loud after render only if index changed and distance is close next instruction
    useEffect(() => {
        console.log(
            'useEffect',
            state,
            { index: instructionIndex, distanceToNext: distanceToNext },
            nextInstruction.text
        )

        let text = nextInstruction.street_name
        if (sound) {
            // making closeDistance dependent on location.speed is tricky because then it can change while driving, so pick the constant average speed
            let averageSpeed = (path.distance / (path.time / 1000)) * 3.6
            let closeDistance = 40 + 2 * Math.round(averageSpeed / 10) * 10
            if (
                distanceToNext <= closeDistance &&
                (state.distanceToNext > closeDistance || instructionIndex != state.index)
            ) {
                getLocationStore().getSpeechSynthesizer().synthesize(nextInstruction.text)
                //TODO enable debugging to UI via URL param:
                //text = closeDistance + ', ' + distanceToNext + ', ' + instructionIndex
            }
        }

        dispatch({ index: instructionIndex, distanceToNext: distanceToNext, text: text })
    }, [instructionIndex, distanceToNext])

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
                                <div>{arrivalDate.getHours() + ':' + (min > 9 ? min : '0' + min)}</div>
                                <div>
                                    {Math.round(location.speed * 3.6)} <small>km/h</small>
                                </div>
                            </div>
                            <div className={styles.endnavicon} onClick={() => getLocationStore().stop()}>
                                <img src={endNavigation} />
                            </div>
                        </div>
                        <div className={styles.turnText}>{state.text}</div>
                    </div>
                </div>
            </div>
        </>
    )
}
