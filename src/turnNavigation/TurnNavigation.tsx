import React, {useEffect, useReducer} from 'react'
import {Instruction, Path} from '@/api/graphhopper'
import {metersToText, milliSecondsToText} from '@/Converters'
import {getTurnSign} from '@/sidebar/instructions/Instructions'
import {getCurrentDetails, getCurrentInstruction} from './GeoMethods'
import styles from '@/turnNavigation/TurnNavigation.module.css'
import endNavigation from '@/turnNavigation/end_turn_navigation.png'
import {getLocationStore} from '@/stores/Stores'
import {LocationStoreState} from '@/stores/LocationStore'
import {tr} from '@/translation/Translation'

type TurnNavigationProps = {
    path: Path
    location: LocationStoreState
    sound: boolean
}

export default function ({path, location, sound}: TurnNavigationProps) {
    let currentLocation = location.coordinate
    if (currentLocation.lat == 0 && currentLocation.lng == 0) return <span>Searching GPS...</span>

    const {instructionIndex, timeToNext, distanceToNext, remainingTime, remainingDistance} = getCurrentInstruction(
        path.instructions,
        currentLocation
    )

    let [calculatedAvgSpeed, maxSpeed] = getCurrentDetails(path, currentLocation, [path.details.average_speed, path.details.max_speed]);

    console.log('remaining distance: ' + remainingDistance + ', time: ' + remainingTime + ', avg: ' + calculatedAvgSpeed + ", max: " + maxSpeed)

    // TODO too far from route - recalculate?
    if (instructionIndex < 0) return <>Cannot find instruction</>

    const nextInstruction: Instruction = path.instructions[instructionIndex]

    // not sure how to access old state with useState alone
    function reducer(
        state: { distanceToNext: number; index: number; text: string },
        action: { distanceToNext: number; index: number; text: string }
    ) {
        return action
    }

    const [state, dispatch] = useReducer(reducer, {index: -1, distanceToNext: -1, text: ''})

    // speak text out loud after render only if index changed and distance is close next instruction
    useEffect(() => {
        console.log(
            'useEffect',
            state,
            {index: instructionIndex, distanceToNext: distanceToNext},
            nextInstruction.text
        )

        let text = nextInstruction.street_name
        if (sound) {
            // making lastAnnounceDistance dependent on location.speed is tricky because then it can change while driving, so pick the constant average speed
            // TODO use instruction average speed of current+next instruction instead of whole path
            let averageSpeed = (path.distance / (path.time / 1000)) * 3.6
            let lastAnnounceDistance = 10 + 2 * Math.round(averageSpeed / 5) * 5

            if (
                distanceToNext <= lastAnnounceDistance &&
                (state.distanceToNext > lastAnnounceDistance || instructionIndex != state.index)
            ) {
                getLocationStore().getSpeechSynthesizer().synthesize(nextInstruction.text)
            }

            let firstAnnounceDistance = 1150
            if (
                averageSpeed > 15 && // two announcements only if faster speed
                distanceToNext > (lastAnnounceDistance + 50) && // do not interfere with last announcement. also "1 km" should stay valid (approximately)
                distanceToNext <= firstAnnounceDistance &&
                (state.distanceToNext > firstAnnounceDistance || instructionIndex != state.index)
            ) {
                let inString = distanceToNext > 800 ? tr('in_km_singular')
                    : tr("in_m", ["" + Math.round(distanceToNext / 100) * 100])
                console.log(inString + ' ' + nextInstruction.text)
                getLocationStore()
                    .getSpeechSynthesizer()
                    .synthesize(inString + ' ' + nextInstruction.text)
            }
        }

        dispatch({index: instructionIndex, distanceToNext: distanceToNext, text: text})
    }, [instructionIndex, distanceToNext])

    const arrivalDate = new Date()
    const currentSpeed = Math.round(location.speed * 3.6)
    arrivalDate.setMilliseconds(arrivalDate.getSeconds() + remainingTime)
    const min = arrivalDate.getMinutes()
    return (
        <>
            <div>
                <div className={styles.turnInfo}>
                    <div className={styles.turnSign}>
                        {
                            maxSpeed == null
                                ? <div className={styles.maxSpeedEmpty}></div>
                                : <div className={styles.maxSpeed}>{Math.round(maxSpeed)}</div>
                        }
                        <div>
                            {getTurnSign(nextInstruction.sign, instructionIndex)}
                        </div>
                        <div>{metersToText(distanceToNext)}</div>
                    </div>
                    <div className={styles.turnInfoRightSide}>
                        <div className={styles.arrival}>
                            <div>
                                <div className={styles.arrivalDuration}>{milliSecondsToText(remainingTime)}</div>
                                <div>{metersToText(remainingDistance)}</div>
                            </div>
                            <div className={styles.arrivalTime}>
                                <div>{arrivalDate.getHours() + ':' + (min > 9 ? min : '0' + min)}</div>
                                <div>{currentSpeed} <small>km/h</small></div>
                            </div>
                            <div className={styles.details}>
                                <div>{Math.round(calculatedAvgSpeed)}</div>
                            </div>
                            <div className={styles.endnavicon} onClick={() => getLocationStore().stop()}>
                                <img src={endNavigation}/>
                            </div>
                        </div>
                        <div className={styles.turnText}>{state.text}</div>
                    </div>
                </div>
            </div>
        </>
    )
}
