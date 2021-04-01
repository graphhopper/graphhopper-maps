import React, { useEffect, useState } from 'react'
import { ApiInfo, Path } from '@/routing/Api'
import { RouteStoreState } from '@/stores/RouteStore'
import { CurrentRequest, QueryStoreState, RequestState, SubRequest } from '@/stores/QueryStore'
import Search from '@/sidebar/search/Search'
import styles from '@/sidebar/Sidebar.module.css'
import Dispatcher from '@/stores/Dispatcher'
import { SetSelectedPath } from '@/actions/Actions'
import Instructions from '@/sidebar/instructions/Instructions'
import Arrow from '@/sidebar/chevron-down-solid.svg'
import { metersToText, milliSecondsToText } from '@/Converters'
import PlainButton from '@/PlainButton'
import Header from '@/sidebar/header.png'

type SidebarProps = {
    query: QueryStoreState
    route: RouteStoreState
    info: ApiInfo
}

export default function ({ query, route, info }: SidebarProps) {
    return (
        <>
            <div className={styles.headerContainer}>
                <img src={Header} alt={'graphhopper logo'} />
            </div>
            <Search points={query.queryPoints} routingVehicles={info.vehicles} selectedVehicle={query.routingVehicle} />
            <QueryResults
                paths={route.routingResult.paths}
                selectedPath={route.selectedPath}
                currentRequest={query.currentRequest}
            />
        </>
    )
}

interface QueryResultsProps {
    paths: Path[]
    selectedPath: Path
    currentRequest: CurrentRequest
}
const QueryResults = (props: QueryResultsProps) => {
    const hasPendingRequests = function (subRequests: SubRequest[]) {
        return subRequests.some(req => req.state === RequestState.SENT)
    }
    const getLength = function (paths: Path[], subRequests: SubRequest[]) {
        if (subRequests.length > 0 && hasPendingRequests(subRequests)) {
            // assuming that the last sub request is the one with most alternative routes
            return Math.max(subRequests[subRequests.length - 1].args.maxAlternativeRoutes, paths.length)
        }
        return paths.length
    }

    const createListContent = function ({ paths, currentRequest, selectedPath }: QueryResultsProps) {
        const length = getLength(paths, currentRequest.subRequests)
        const result = []
        for (let i = 0; i < length; i++) {
            if (i < paths.length) result.push(<QueryResult path={paths[i]} isSelected={paths[i] === selectedPath} />)
            else result.push(<QueryResultPlaceholder />)
        }

        return result
    }

    return (
        <div className={styles.resultListContainer}>
            <ul>{createListContent(props)}</ul>
        </div>
    )
}

const QueryResult = ({ path, isSelected }: { path: Path; isSelected: boolean }) => {
    const [isExpanded, setExpanded] = useState(false)
    const buttonClass = isExpanded ? styles.detailsButtonFlipped : styles.detailsButton
    const resultSummaryClass = isSelected
        ? styles.resultSummary + ' ' + styles.selectedResultSummary
        : styles.resultSummary

    useEffect(() => setExpanded(isSelected && isExpanded), [isSelected])

    return (
        <div className={styles.resultRow}>
            <div className={styles.resultSelectableArea} onClick={() => Dispatcher.dispatch(new SetSelectedPath(path))}>
                <div className={resultSummaryClass}>
                    <div className={styles.resultValues}>
                        <span className={styles.resultMainText}>{milliSecondsToText(path.time)}</span>
                        <span className={styles.resultSecondaryText}>{metersToText(path.distance)}</span>
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

const QueryResultPlaceholder = function () {
    return (
        <div className={styles.resultRow}>
            <div className={styles.placeholderContainer}>
                <div className={styles.placeholderMain} />
                <div className={styles.placeholderMain + ' ' + styles.placeholderSecondary} />
            </div>
        </div>
    )
}
