import styles from '@/sidebar/instructions/Instructions.module.css'
import { useContext } from 'react'

import uTurn from './u_turn.png'
import uTurnLeft from './u_turn_left.png'
import keepLeft from './keep_left.png'
import sharpLeft from './sharp_left.png'
import left from './left.png'
import slightLeft from './slight_left.png'
import continueImg from './continue.png'
import slightRight from './slight_right.png'
import right from './right.png'
import sharpRight from './sharp_right.png'
import roundabout from './roundabout.png'
import keepRight from './keep_right.png'
import uTurnRight from './u_turn_right.png'
import ptStartTrip from './pt_start_trip.png'
import ptTransferTo from './pt_transfer_to.png'
import ptEndTrip from './pt_end_trip.png'
import { metersToText } from '@/Converters'
import { Instruction } from '@/api/graphhopper'
import { MarkerComponent } from '@/map/Marker'
import QueryStore, { QueryPointType } from '@/stores/QueryStore'
import { ShowDistanceInMilesContext } from '@/ShowDistanceInMilesContext'
import Dispatcher from '@/stores/Dispatcher'
import { InstructionClicked } from '@/actions/Actions'

export default function (props: { instructions: Instruction[] }) {
    return (
        <ul className={styles.instructionsList}>
            {props.instructions.map((instruction, i) => (
                <Line key={i} instruction={instruction} index={i} />
            ))}
        </ul>
    )
}

const Line = function ({ instruction, index }: { instruction: Instruction; index: number }) {
    const showDistanceInMiles = useContext(ShowDistanceInMilesContext)
    return (
        <li
            className={styles.instruction}
            onClick={() =>
                Dispatcher.dispatch(
                    new InstructionClicked(
                        { lng: instruction.points[0][0], lat: instruction.points[0][1] },
                        instruction.text
                    )
                )
            }
        >
            {getTurnSign(instruction.sign, index)}
            <span className={styles.mainText}>{instruction.text}</span>
            <span className={styles.distance}>{metersToText(instruction.distance, showDistanceInMiles)}</span>
        </li>
    )
}

function getTurnSign(sign: number, index: number) {
    // from, via and to signs are special
    if (index === 0 || sign === 4 || sign === 5) {
        let markerColor
        if (index === 0) {
            markerColor = QueryStore.getMarkerColor(QueryPointType.From)
        } else if (sign === 4) {
            markerColor = QueryStore.getMarkerColor(QueryPointType.To)
        } else {
            markerColor = QueryStore.getMarkerColor(QueryPointType.Via)
        }

        return (
            <div className={styles.sign}>
                <MarkerComponent color={markerColor} />
            </div>
        )
    }
    return <img className={styles.sign} src={getSignName(sign)} alt={'turn instruction'} />
}

function getSignName(sign: number) {
    switch (sign) {
        case -98:
            return uTurn
        case -8:
            return uTurnLeft
        case -7:
            return keepLeft
        case -3:
            return sharpLeft
        case -2:
            return left
        case -1:
            return slightLeft
        case 0:
            return continueImg
        case 1:
            return slightRight
        case 2:
            return right
        case 3:
            return sharpRight
        case 6:
            return roundabout
        case 7:
            return keepRight
        case 8:
            return uTurnRight
        case 101:
            return ptStartTrip
        case 102:
            return ptTransferTo
        case 103:
            return ptEndTrip
        default:
            return 'unknown'
    }
}
