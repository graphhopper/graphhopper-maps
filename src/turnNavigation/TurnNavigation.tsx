import React from 'react'
import { Path, Instruction } from '@/api/graphhopper'
import { metersToText, milliSecondsToText } from '@/Converters'
import { getSignName } from '@/sidebar/instructions/Instructions'
import styles from '@/turnNavigation/TurnNavigation.module.css'

type TurnNavigationProps = {
    path: Path
}

export default function ({ path }: TurnNavigationProps) {
    const instructionIndex: number = 0
    const nextInstruction: Instruction = path.instructions[instructionIndex]
    const arrivalDate = new Date()
    arrivalDate.setMilliseconds(arrivalDate.getSeconds() + path.time)
    const min = arrivalDate.getMinutes()
    return (
        <>
            <div className={styles.turnInfo}>
                <div className={styles.turnSign}>
                    <div>
                        <img src={getSignName(nextInstruction.sign, instructionIndex)} alt={'turn instruction'} />
                    </div>
                    <div>{metersToText(nextInstruction.distance)}</div>
                </div>
                <div className={styles.turnText}>{nextInstruction.text}</div>
            </div>
            <div className={styles.arrival}>
                <div>
                    <b>{arrivalDate.getHours() + ':' + (min > 10 ? min : '0' + min)} Uhr</b>
                </div>
                <div>{milliSecondsToText(path.time)}</div>
                <div>{metersToText(path.distance)}</div>
            </div>
        </>
    )
}
