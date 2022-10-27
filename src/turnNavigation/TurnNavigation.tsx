import React, { useContext, useEffect, useState } from 'react'
import { Instruction, Path } from '@/api/graphhopper'
import { metersToText, milliSecondsToText } from '@/Converters'
import instructions, { getTurnSign } from '@/sidebar/instructions/Instructions'
import { getCurrentDetails, getCurrentInstruction } from './GeoMethods'
import styles from '@/turnNavigation/TurnNavigation.module.css'
import endNavigation from '@/turnNavigation/end_turn_navigation.png'
import { getLocationStore } from '@/stores/Stores'
import { LocationStoreState } from '@/stores/LocationStore'
import { tr } from '@/translation/Translation'
import { ShowDistanceInMilesContext } from '@/ShowDistanceInMilesContext'
import Dispatcher from '@/stores/Dispatcher'
import { TurnNavigationStop, SetPoint, ZoomMapToPoint } from '@/actions/Actions'
import { QueryPoint } from '@/stores/QueryStore'

type TurnNavigationProps = {
    queryPoints: QueryPoint[]
    path: Path
    location: LocationStoreState
}

export default function ({ queryPoints, path, location }: TurnNavigationProps) {
    let currentLocation = location.coordinate

    let [showTime, setShowTime] = useState(true)
    let [showDebug, setShowDebug] = useState(false)
    const [instructionState, setInstructionState] = useState({
        index: -1,
        distanceToNext: -1,
        remainingTime: -1,
        remainingDistance: -1,
        text: '',
    })

    const [pathDetails, setPathDetails] = useState({ maxSpeed: -1, estimatedAvgSpeed: -1, surface: '', roadClass: '' })
    const { soundEnabled } = useContext(ShowDistanceInMilesContext)

    // render only if index changed and distance is close next instruction
    useEffect(() => {
        const { instructionIndex, timeToNext, distanceToNext, distanceToRoute, remainingTime, remainingDistance } =
            getCurrentInstruction(path.instructions, currentLocation)

        if (instructionIndex < 0) return

        // TODO NOW how can we avoid calling this inside useEffect!?
        // TODO NOW if this dispatch is called we get an undefined instruction and this is necessary below: !path.instructions[instructionState.index]
        //          and for a short time the "cannot find instruction" screen is displayed (flickering)
        if (distanceToRoute > 50) {
            Dispatcher.dispatch(
                new SetPoint({ ...queryPoints[0], coordinate: location.coordinate } as QueryPoint, false)
            )
            getLocationStore().getSpeechSynthesizer().synthesize(tr('reroute'))
            return
        }

        const nextInstruction: Instruction = path.instructions[instructionIndex]

        let text = nextInstruction.street_name
        if (soundEnabled) {
            // making lastAnnounceDistance dependent on location.speed is tricky because then it can change while driving, so pick the constant average speed
            // TODO use instruction average speed of current+next instruction instead of whole path
            let averageSpeed = (path.distance / (path.time / 1000)) * 3.6
            let lastAnnounceDistance = 10 + 2 * Math.round(averageSpeed / 5) * 5

            if (
                distanceToNext <= lastAnnounceDistance &&
                (instructionState.distanceToNext > lastAnnounceDistance || instructionIndex != instructionState.index)
            ) {
                getLocationStore().getSpeechSynthesizer().synthesize(nextInstruction.text)
            }

            let firstAnnounceDistance = 1150
            if (
                averageSpeed > 15 && // two announcements only if faster speed
                distanceToNext > lastAnnounceDistance + 50 && // do not interfere with last announcement. also "1 km" should stay valid (approximately)
                distanceToNext <= firstAnnounceDistance &&
                (instructionState.distanceToNext > firstAnnounceDistance || instructionIndex != instructionState.index)
            ) {
                let inString =
                    distanceToNext > 800
                        ? tr('in_km_singular')
                        : tr('in_m', ['' + Math.round(distanceToNext / 100) * 100])
                getLocationStore()
                    .getSpeechSynthesizer()
                    .synthesize(inString + ' ' + nextInstruction.text)
            }
        }

        setInstructionState({ index: instructionIndex, distanceToNext, remainingTime, remainingDistance, text })

        let [estimatedAvgSpeed, maxSpeed, surface, roadClass] = getCurrentDetails(path, currentLocation, [
            path.details.average_speed,
            path.details.max_speed,
            path.details.surface,
            path.details.road_class,
        ])
        setPathDetails({ estimatedAvgSpeed: Math.round(estimatedAvgSpeed), maxSpeed, surface, roadClass })
    }, [currentLocation, path])

    const arrivalDate = new Date()
    const currentSpeed = Math.round(location.speed * 3.6)
    arrivalDate.setMilliseconds(arrivalDate.getSeconds() + instructionState.remainingTime)
    const min = arrivalDate.getMinutes()

    return instructionState.index < 0 || !path.instructions[instructionState.index] ? (
        <>Cannot find instruction</>
    ) : (
        <>
            <div>
                <div className={styles.turnInfo}>
                    <div className={styles.turnSign}>
                        <div>{getTurnSign(path.instructions[instructionState.index].sign, instructionState.index)}</div>
                        <div>{metersToText(instructionState.distanceToNext, false)}</div>
                    </div>
                    <div className={styles.turnInfoRightSide}>
                        <div className={styles.arrival}>
                            <div onClick={() => setShowTime(!showTime)}>
                                {showTime ? (
                                    <div>
                                        {arrivalDate.getHours() + ':' + (min > 9 ? min : '0' + min)}
                                        <svg width="30" height="8">
                                            <circle cx="5" cy="4" r="3" />
                                            <circle cx="20" cy="4" r="3.5" stroke="black" fill="white" />
                                        </svg>
                                    </div>
                                ) : (
                                    <div className={styles.arrivalDuration}>
                                        {milliSecondsToText(instructionState.remainingTime)}
                                        <svg width="30" height="8">
                                            <circle cx="5" cy="4" r="3" stroke="black" fill="white" />
                                            <circle cx="20" cy="4" r="3.5" />
                                        </svg>
                                    </div>
                                )}
                                <div className={styles.remainingDistance}>
                                    {metersToText(instructionState.remainingDistance, false)}
                                </div>
                            </div>
                            <div onClick={() => setShowDebug(!showDebug)}>
                                <div>{currentSpeed} km/h</div>
                                {pathDetails.maxSpeed != null ? (
                                    <div className={styles.maxSpeed}>{Math.round(pathDetails.maxSpeed)}</div>
                                ) : null}
                                {showDebug ? (
                                    <div className={styles.debug}>
                                        <div>{pathDetails.estimatedAvgSpeed}</div>
                                        <div>{pathDetails.surface}</div>
                                        <div>{pathDetails.roadClass}</div>
                                    </div>
                                ) : null}
                            </div>
                            <div
                                className={styles.thirdCol}
                                onClick={() => {
                                    Dispatcher.dispatch(new TurnNavigationStop())
                                    Dispatcher.dispatch(new ZoomMapToPoint(location.coordinate, 15, 0, 0, false))
                                }}
                            >
                                <img src={endNavigation} />
                            </div>
                        </div>
                        <div>{instructionState.text}</div>
                    </div>
                </div>
            </div>
        </>
    )
}
