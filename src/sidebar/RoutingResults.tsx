import { Path } from '@/api/graphhopper'
import { CurrentRequest, RequestState, SubRequest } from '@/stores/QueryStore'
import styles from './RoutingResult.module.css'
import React, { useEffect, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { SetSelectedPath, TurnNavigationUpdate } from '@/actions/Actions'
import { metersToText, milliSecondsToText } from '@/Converters'
import PlainButton from '@/PlainButton'
import Arrow from '@/sidebar/chevron-down-solid.svg'
import Instructions from '@/sidebar/instructions/Instructions'
import { useMediaQuery } from 'react-responsive'
import { getLocationStore } from '@/stores/Stores'
import startNavigation from '@/sidebar/start_turn_navigation.png'
import { TurnNavigationState } from "@/stores/TurnNavigationStore";
import {tr} from "@/translation/Translation";

export interface RoutingResultsProps {
    paths: Path[]
    selectedPath: Path
    currentRequest: CurrentRequest
    turnNaviState: TurnNavigationState
}

export default function RoutingResults(props: RoutingResultsProps) {
    const isShortScreen = useMediaQuery({ query: '(max-height: 55rem)' })
    return <ul>{isShortScreen ? createSingletonListContent(props) : createListContent(props)}</ul>
}

function RoutingResult({ path, isSelected, turnNaviState }: { path: Path; isSelected: boolean, turnNaviState: TurnNavigationState }) {
    const [isExpanded, setExpanded] = useState(false)
    const buttonClass = isExpanded ? styles.detailsButtonFlipped : styles.detailsButton
    const resultSummaryClass = isSelected
        ? styles.resultSummary + ' ' + styles.selectedResultSummary
        : styles.resultSummary

    useEffect(() => setExpanded(isSelected && isExpanded), [isSelected])
    let [showRisk, setShowRisk] = useState(false)

    return (
        <div className={styles.resultRow}>
            <div className={styles.resultSelectableArea} onClick={() => Dispatcher.dispatch(new SetSelectedPath(path))}>
                <div className={resultSummaryClass}>
                    <div className={styles.resultValues}>
                        <span className={styles.resultMainText}>{milliSecondsToText(path.time)}</span>
                        <span className={styles.resultSecondaryText}>{metersToText(path.distance)}</span>
                    </div>
                    <div>
                        {!turnNaviState.acceptedRisk && !turnNaviState.fakeGPS
                            ? (!showRisk
                                ? <img onClick={() => setShowRisk(true)} src={startNavigation}/>
                                : <div>
                                    <div>{tr("warning")}</div>
                                    <PlainButton className={styles.acceptRiskButton} onClick={() => {
                                        Dispatcher.dispatch(new TurnNavigationUpdate({acceptedRisk: true} as TurnNavigationState))
                                        return getLocationStore().initReal()}
                                    }>I understand and agree</PlainButton>
                                </div>)
                            : <img onClick={() => turnNaviState.fakeGPS ? getLocationStore().initFake() : getLocationStore().initReal()} src={startNavigation}/>
                        }
                    </div>
                    {isSelected && (
                        <PlainButton className={buttonClass} onClick={() => setExpanded(!isExpanded)}>
                            <Arrow />
                        </PlainButton>
                    )}
                </div>
            </div>
            {isExpanded && <Instructions instructions={path.instructions} />}
        </div>
    )
}

function RoutingResultPlacelholder() {
    return (
        <div className={styles.resultRow}>
            <div className={styles.placeholderContainer}>
                <div className={styles.placeholderMain} />
                <div className={styles.placeholderMain + ' ' + styles.placeholderSecondary} />
            </div>
        </div>
    )
}

function hasPendingRequests(subRequests: SubRequest[]) {
    return subRequests.some(req => req.state === RequestState.SENT)
}

function getLength(paths: Path[], subRequests: SubRequest[]) {
    if (subRequests.length > 0 && hasPendingRequests(subRequests)) {
        // assuming that the last sub request is the one with most alternative routes
        return Math.max(subRequests[subRequests.length - 1].args.maxAlternativeRoutes, paths.length)
    }
    return paths.length
}

function createSingletonListContent({ paths, currentRequest, selectedPath, turnNaviState }: RoutingResultsProps) {
    if (paths.length > 0) return <RoutingResult path={selectedPath} isSelected={true} turnNaviState={turnNaviState} />
    if (hasPendingRequests(currentRequest.subRequests)) return <RoutingResultPlacelholder key={1} />
    return ''
}

function createListContent({ paths, currentRequest, selectedPath, turnNaviState }: RoutingResultsProps) {
    const length = getLength(paths, currentRequest.subRequests)
    const result = []

    for (let i = 0; i < length; i++) {
        if (i < paths.length)
            result.push(<RoutingResult key={i} path={paths[i]} isSelected={paths[i] === selectedPath} turnNaviState={turnNaviState} />)
        else result.push(<RoutingResultPlacelholder key={i} />)
    }

    return result
}
