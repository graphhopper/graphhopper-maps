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
            <QueryResults paths={route.routingResult.paths} />
        </>
    )
}

const QueryResults = (props: { paths: Path[] }) => (
    <div className={styles.resultListContainer}>
        <ul className={styles.resultList}>
            {props.paths.map((path, i) => (
                <li key={i}>
                    <QueryResult path={path} />
                </li>
            ))}
        </ul>
    </div>
)

const QueryResult = (props: { path: Path }) => {
    const [isExpanded, setExpanded] = useState(false)
    const buttonText = isExpanded ? 'Hide' : 'Details'

    return (
        <div className={styles.resultRow}>
            <div className={styles.resultSummary}>
                <div className={styles.resultValues}>
                    <span>{distanceFormat.format(props.path.distance / 1000)}km</span>
                    <span>{milliSecondsToText(props.path.time)}</span>
                </div>
                <button className={styles.resultExpandDirections} onClick={() => setExpanded(!isExpanded)}>
                    {buttonText}
                </button>
            </div>
            {isExpanded && <Instructions instructions={props.path.instructions} />}
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
