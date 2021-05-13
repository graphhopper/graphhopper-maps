import React, { useEffect, useState } from 'react'
import { QueryPoint, QueryStoreState } from '@/stores/QueryStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { ApiInfo, RoutingVehicle } from '@/api/graphhopper'
import { ErrorStoreState } from '@/stores/ErrorStore'
import styles from './MobileSidebar.module.css'
import Search from '@/sidebar/search/Search'
import QueryResults from '@/sidebar/QueryResults'
import PlainButton from '@/PlainButton'
import ChevronIcon from '@/sidebar/chevron-down-solid.svg'
import ErrorMessage from '@/sidebar/ErrorMessage'

type MobileSidebarProps = {
    query: QueryStoreState
    route: RouteStoreState
    info: ApiInfo
    error: ErrorStoreState
}

export default function ({ query, route, info, error }: MobileSidebarProps) {
    const [isSmallSearchView, setIsSmallSearchView] = useState(true)

    useEffect(() => {
        if (route.routingResult.paths.length === 0) setIsSmallSearchView(false)
        else setIsSmallSearchView(true)
    }, [route.routingResult])

    // query results get only the selected path as result list. If we like having just one path on the small layout we can change
    // the store so that it will only fetch a single route on mobile
    return (
        <div className={styles.sidebar}>
            <div className={styles.background}>
                {isSmallSearchView ? (
                    <MapView
                        points={query.queryPoints}
                        vehicle={query.routingVehicle}
                        onClick={() => setIsSmallSearchView(false)}
                    />
                ) : (
                    <SearchView
                        points={query.queryPoints}
                        routingVehicles={info.vehicles}
                        selectedVehicle={query.routingVehicle}
                        onClose={() => setIsSmallSearchView(true)}
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
    onClose: () => void
}) {
    return (
        <div className={styles.btnCloseContainer}>
            <Search
                points={props.points}
                routingVehicles={props.routingVehicles}
                selectedVehicle={props.selectedVehicle}
            />
            <PlainButton onClick={() => props.onClose()} className={styles.btnClose}>
                <ChevronIcon />
            </PlainButton>
        </div>
    )
}

function MapView(props: { points: QueryPoint[]; vehicle: RoutingVehicle; onClick: () => void }) {
    const from = props.points[0]
    const to = props.points[props.points.length - 1]

    return (
        <div className={styles.mapView} onClick={props.onClick}>
            <MapViewPoint {...from} fontSize={'1.0rem'} fontWeight={'lighter'} />
            <IntermediatePoint points={props.points} />
            <MapViewPoint {...to} fontSize={'1.0rem'} fontWeight={'bold'} />
        </div>
    )
}

// call this queryText, so that QueryPoints can be passed in as props because they have a fitting shape
function MapViewPoint({
    queryText,
    color,
    fontWeight,
    fontSize,
}: {
    queryText: string
    color: string
    fontWeight:
        | 'lighter'
        | 'bold'
        | '-moz-initial'
        | 'inherit'
        | 'initial'
        | 'revert'
        | 'unset'
        | 'normal'
        | (number & {})
        | 'bolder'
        | undefined
    fontSize: string
}) {
    // @ts-ignore
    return (
        <div className={styles.mapViewPoint}>
            <div className={styles.dot} style={{ backgroundColor: color }} />
            <span style={{ fontWeight: fontWeight, fontSize: fontSize }}>{queryText}</span>
        </div>
    )
}

function IntermediatePoint({ points }: { points: QueryPoint[] }) {
    // for a total number of three points display intermediate via point
    if (points.length === 3) return <MapViewPoint fontSize={'0.8rem'} fontWeight={'lighter'} {...points[1]} />

    // for more than total of three points display the number of via points
    if (points.length > 3)
        return (
            <MapViewPoint
                queryText={points.length - 2 + ' via points'}
                color={'#76D0F7'}
                fontSize={'0.8rem'}
                fontWeight={'lighter'}
            />
        )

    return <div /> // in case of no via points display nothing
}
