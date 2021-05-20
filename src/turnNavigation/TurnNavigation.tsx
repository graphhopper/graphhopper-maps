import React from 'react'
import { Path, Instruction } from '@/api/graphhopper'
import { metersToText, milliSecondsToText } from '@/Converters'
import { getSignName } from '@/sidebar/instructions/Instructions'
import styles from '@/turnNavigation/TurnNavigation.module.css'
import { Coordinate } from '@/stores/QueryStore'

type TurnNavigationProps = {
    path: Path
    currentLocation: Coordinate
}

export default function ({ path, currentLocation }: TurnNavigationProps) {
    const { instructionIndex, distanceNext } = getCurrentInstruction(path.instructions, currentLocation)
    if (instructionIndex < 0) return <>Cannot find instruction</>

    const nextInstruction: Instruction = path.instructions[instructionIndex]

    // TODO better approximation via estimating taken time
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
                    <div>{metersToText(distanceNext)}</div>
                </div>
                <div className={styles.turnText}>{nextInstruction.text}</div>
            </div>
            <div className={styles.arrival}>
                <div className={styles.arrival_date}>
                    {arrivalDate.getHours() + ':' + (min > 10 ? min : '0' + min)} Uhr
                </div>
                <div>{milliSecondsToText(path.time)}</div>
                <div>{metersToText(path.distance)}</div>
            </div>
        </>
    )
}

function getCurrentInstruction(
    instructions: Instruction[],
    currentLocation: Coordinate
): { instructionIndex: number; distanceNext: number } {
    var instructionIndex = -1
    var smallestDist = Number.MAX_VALUE
    var distanceNext = 10.0
    // find instruction nearby and very simple method (pick first point)
    for (var instrIdx = 0; instrIdx < instructions.length; instrIdx++) {
        const points: number[][] = instructions[instrIdx].points

        for (var pIdx = 0; pIdx < points.length; pIdx++) {
            const p: number[] = points[pIdx]
            const dist = distCalc(p[1], p[0], currentLocation.lat, currentLocation.lng)
            if (dist < smallestDist) {
                smallestDist = dist
                // use next instruction or finish
                instructionIndex = instrIdx + 1 < instructions.length ? instrIdx + 1 : instrIdx

                const last: number[] = points[points.length - 1]
                distanceNext = Math.round(distCalc(last[1], last[0], currentLocation.lat, currentLocation.lng))
            }
        }
    }
    return { instructionIndex, distanceNext }
}

function distCalc(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    const sinDeltaLat: number = Math.sin(toRadians(toLat - fromLat) / 2)
    const sinDeltaLon: number = Math.sin(toRadians(toLng - fromLng) / 2)
    const normedDist: number =
        sinDeltaLat * sinDeltaLat +
        sinDeltaLon * sinDeltaLon * Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat))
    return 6371000 * 2 * Math.asin(Math.sqrt(normedDist))
}

function toRadians(deg: number): number {
    return (deg * Math.PI) / 180.0
}
