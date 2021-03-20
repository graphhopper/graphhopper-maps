import React, { useState } from 'react'
import { ApiInfo, Instruction, Path } from '@/routing/Api'
import { RouteStoreState } from '@/stores/RouteStore'
import { QueryStoreState } from '@/stores/QueryStore'
import Search from '@/Search'
import styles from '@/Sidebar.module.css'

const distanceFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 })

type SidebarProps = {
    query: QueryStoreState
    route: RouteStoreState
    info: ApiInfo
}

export default function ({ query, route, info }: SidebarProps) {
    return (
        <>
            <Search points={query.queryPoints} routingVehicles={info.vehicles} selectedVehicle={query.routingVehicle} />
            <QueryResults paths={route.routingResult.paths} selectedPath={route.selectedPath} />
        </>
    )
}

const QueryResults = (props: { paths: Path[]; selectedPath: Path }) => (
    <div className={styles.resultListContainer}>
        <ul>
            {props.paths.map((path, i) => (
                <li key={i}>
                    <QueryResult path={path} isSelected={path === props.selectedPath} />
                </li>
            ))}
        </ul>
    </div>
)

const QueryResult = ({ path, isSelected }: { path: Path; isSelected: boolean }) => {
    const [isExpanded, setExpanded] = useState(false)
    const buttonText = isExpanded ? 'Hide' : 'Details'
    const resultSummaryClass = isSelected
        ? styles.resultSummary + ' ' + styles.selectedResultSummary
        : styles.resultSummary

    return (
        <div className={styles.resultRow}>
            <div className={styles.resultSelectableArea}>
                <div className={resultSummaryClass}>
                    <div className={styles.resultValues}>
                        <span>{distanceFormat.format(path.distance / 1000)}km</span>
                        <span>{milliSecondsToText(path.time)}</span>
                    </div>
                    {isSelected && (
                        <button className={styles.resultExpandDirections} onClick={() => setExpanded(!isExpanded)}>
                            {buttonText}
                        </button>
                    )}
                </div>
            </div>
            {isExpanded && <Instructions instructions={path.instructions} />}
        </div>
    )
}

const Instructions = (props: { instructions: Instruction[] }) => (
    <ul className={styles.instructionsList}>
        {props.instructions.map((instruction, i) => (
            <li key={i}>{instruction.text}</li>
        ))}
    </ul>
)

function milliSecondsToText(seconds: number) {
    const hours = Math.floor(seconds / 3600000)
    const minutes = Math.floor((seconds % 3600000) / 60000)

    const hourText = hours > 0 ? hours + 'h' : ''
    return hourText + ' ' + minutes + 'min'
}
