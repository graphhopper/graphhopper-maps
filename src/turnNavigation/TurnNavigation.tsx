import React, { useState } from 'react'
import { metersToText, milliSecondsToText } from '@/Converters'
import { getTurnSign } from '@/sidebar/instructions/Instructions'
import styles from '@/turnNavigation/TurnNavigation.module.css'
import EndNavigation from '@/sidebar/times-solid.svg'
import { TurnNavigationStoreState } from '@/stores/TurnNavigationStore'
import Dispatcher from '@/stores/Dispatcher'
import { SelectMapLayer, TurnNavigationStop } from '@/actions/Actions'
import PlainButton from '@/PlainButton'
import { ApiImpl } from '@/api/Api'

export default function ({ turnNavigation }: { turnNavigation: TurnNavigationStoreState }) {
    if (turnNavigation.activePath == null) new Error('activePath cannot be null if TurnNavigation is enabled')
    const instruction = turnNavigation.instruction
    const pd = turnNavigation.pathDetails

    let [showTime, setShowTime] = useState(true)
    let [showDebug, setShowDebug] = useState(false)

    const arrivalDate = new Date()
    const currentSpeed = Math.round(turnNavigation.speed * 3.6)
    arrivalDate.setMilliseconds(arrivalDate.getSeconds() + instruction.timeToEnd)
    const min = arrivalDate.getMinutes()

    return (
        <>
            <div className={styles.turnInfo}>
                <div className={styles.turnSign}>
                    <div>{getTurnSign(instruction.sign, instruction.index, instruction.nextWaypointIndex)}</div>
                    <div>{metersToText(instruction.distanceToTurn, false)}</div>
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
                                <div>
                                    {milliSecondsToText(instruction.timeToEnd)}
                                    <svg width="30" height="8">
                                        <circle cx="5" cy="4" r="3" stroke="black" fill="white" />
                                        <circle cx="20" cy="4" r="3.5" />
                                    </svg>
                                </div>
                            )}
                            <div className={styles.remainingDistance}>
                                {metersToText(instruction.distanceToEnd, false)}
                            </div>
                        </div>
                    </div>
                    <div className={styles.currentData} onClick={() => setShowDebug(!showDebug)}>
                        <div className={styles.speedRow}>
                            <div className={styles.currentSpeed}>{currentSpeed} km/h</div>
                            <div className={styles.maxSpeed}>
                                {pd.maxSpeed != null &&
                                (ApiImpl.isMotorVehicle(turnNavigation.activeProfile) || pd.maxSpeed > 50) ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 40 40"
                                        width="40px"
                                        height="40px"
                                    >
                                        <circle
                                            cx="19"
                                            cy="19"
                                            r="17"
                                            stroke="rgba(255, 0, 0, 0.6)"
                                            strokeWidth="3px"
                                            fill="none"
                                        />
                                        <text x="50%" y="25" textAnchor="middle" style={{ fontSize: '18px' }}>
                                            {Math.round(pd.maxSpeed)}
                                        </text>
                                    </svg>
                                ) : null}
                            </div>
                        </div>
                        <div className={styles.instructionText} title={instruction.text}>
                            {instruction.text}
                        </div>
                        {showDebug ? (
                            <div className={styles.debug}>
                                <span>{pd.estimatedAvgSpeed}, </span>
                                <span>{pd.surface}, </span>
                                <span>{pd.roadClass}</span>
                            </div>
                        ) : null}
                    </div>
                    <PlainButton
                        className={styles.thirdCol}
                        onClick={() => {
                            if (turnNavigation.settings.forceVectorTiles)
                                Dispatcher.dispatch(new SelectMapLayer(turnNavigation.oldTiles))
                            Dispatcher.dispatch(new TurnNavigationStop())
                        }}
                    >
                        <EndNavigation />
                    </PlainButton>
                </div>
            </div>
        </>
    )
}
