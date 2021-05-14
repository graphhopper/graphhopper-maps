import React, { useCallback, useEffect, useRef, useState } from 'react'
import { QueryPoint, QueryPointType, QueryStoreState } from '@/stores/QueryStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { ApiInfo, RoutingVehicle } from '@/api/graphhopper'
import { ErrorStoreState } from '@/stores/ErrorStore'
import styles from './MobileSidebar.module.css'
import Search from '@/sidebar/search/Search'
import QueryResults from '@/sidebar/QueryResults'
import ErrorMessage from '@/sidebar/ErrorMessage'

type MobileSidebarProps = {
    query: QueryStoreState
    route: RouteStoreState
    info: ApiInfo
    error: ErrorStoreState
}

export default function ({ query, route, info, error }: MobileSidebarProps) {
    const [isSmallSearchView, setIsSmallSearchView] = useState(true)

    // the following ref, callback and effect minimize the search view if there is any interaction outside the search panel
    const searchContainerRef = useRef<HTMLDivElement>(null)
    const handleWindowClick = useCallback((event: Event) => {
        const clickInside = event.target instanceof Node && searchContainerRef.current?.contains(event.target)
        if (!clickInside) setIsSmallSearchView(true)
    }, [])
    useEffect(() => {
        window.addEventListener('mousedown', handleWindowClick)
        window.addEventListener('touchstart', handleWindowClick)
        return () => {
            window.removeEventListener('mousedown', handleWindowClick)
            window.removeEventListener('touchstart', handleWindowClick)
        }
    })

    // query results get only the selected path as result list. If we like having just one path on the small layout we can change
    // the store so that it will only fetch a single route on mobile
    return (
        <div className={styles.sidebar}>
            <div className={styles.background} ref={searchContainerRef}>
                {isSmallSearchView ? (
                    <SmallSearchView
                        points={query.queryPoints}
                        vehicle={query.routingVehicle}
                        onClick={() => setIsSmallSearchView(false)}
                    />
                ) : (
                    <SearchView
                        points={query.queryPoints}
                        routingVehicles={info.vehicles}
                        selectedVehicle={query.routingVehicle}
                    />
                )}
            </div>
            {!error.isDismissed && <ErrorMessage error={error} />}
            <div className={styles.background}>
                <QueryResults
                    paths={route.routingResult.paths.length > 0 ? [route.selectedPath] : []}
                    selectedPath={route.selectedPath}
                    currentRequest={query.currentRequest}
                />
            </div>
        </div>
    )
}

function SearchView(props: {
    points: QueryPoint[]
    routingVehicles: RoutingVehicle[]
    selectedVehicle: RoutingVehicle
}) {
    return (
        <div className={styles.btnCloseContainer}>
            <Search
                points={props.points}
                routingVehicles={props.routingVehicles}
                selectedVehicle={props.selectedVehicle}
            />
        </div>
    )
}

function SmallSearchView(props: { points: QueryPoint[]; vehicle: RoutingVehicle; onClick: () => void }) {
    const from = props.points[0]
    const to = props.points[props.points.length - 1]

    return (
        <div className={styles.mapView} onClick={props.onClick}>
            <SmallQueryPoint text={from.queryText} color={from.color} position={from.type} />
            <IntermediatePoint points={props.points} />
            <SmallQueryPoint text={to.queryText} color={to.color} position={to.type} />
        </div>
    )
}

// call this queryText, so that QueryPoints can be passed in as props because they have a fitting shape
function SmallQueryPoint({ text, color, position }: { text: string; color: string; position: QueryPointType }) {
    // @ts-ignore
    return (
        <div className={styles.mapViewPoint}>
            <div className={styles.dot} style={{ backgroundColor: color }} />
            <span className={getClassName(position)}>{text}</span>
        </div>
    )
}

function getClassName(position: QueryPointType) {
    switch (position) {
        case QueryPointType.To:
            return styles.queryPointText + ' ' + styles.queryPointTextTo
        case QueryPointType.Via:
            return styles.queryPointText + ' ' + styles.queryPointTextVia
        default:
            return styles.queryPointText
    }
}

function IntermediatePoint({ points }: { points: QueryPoint[] }) {
    // for a total number of three points display intermediate via point
    if (points.length === 3)
        return <SmallQueryPoint text={points[1].queryText} color={points[1].color} position={QueryPointType.Via} />

    // for more than total of three points display the number of via points
    if (points.length > 3)
        return (
            <SmallQueryPoint text={points.length - 2 + ' via points'} color={'#76D0F7'} position={QueryPointType.Via} />
        )

    return <div /> // in case of no via points display nothing
}
