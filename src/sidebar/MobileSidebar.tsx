import React, { useEffect, useState } from 'react'
import { QueryPoint, QueryStoreState } from '@/stores/QueryStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { ApiInfo, RoutingVehicle } from '@/api/graphhopper'
import { ErrorStoreState } from '@/stores/ErrorStore'
import styles from './MobileSidebar.module.css'
import AddressInput from '@/sidebar/search/AddressInput'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint } from '@/actions/Actions'
import { convertToQueryText } from '@/Converters'
import Search from '@/sidebar/search/Search'
import QueryResults from '@/sidebar/QueryResults'
import PlainButton from '@/PlainButton'
import ChevronIcon from '@/sidebar/chevron-down-solid.svg'

type MobileSidebarProps = {
    query: QueryStoreState
    route: RouteStoreState
    info: ApiInfo
    error: ErrorStoreState
}

enum Screen {
    MapView,
    SearchView,
    AddressSearch,
    RouteView,
}
export default function ({ query, route, info, error }: MobileSidebarProps) {
    const [currentScreen, setCurrentScreen] = useState(Screen.SearchView)
    useEffect(() => {
        if (route.routingResult.paths.length > 0) setCurrentScreen(Screen.MapView)
    }, [route.routingResult])
    const [currentPoint, setCurrentPoint] = useState<QueryPoint>(query.queryPoints[0])

    const getScreen = function () {
        switch (currentScreen) {
            case Screen.SearchView:
                return (
                    <SearchView
                        points={query.queryPoints}
                        routingVehicles={info.vehicles}
                        selectedVehicle={query.routingVehicle}
                        onFocus={point => {
                            setCurrentPoint(point)
                            setCurrentScreen(Screen.AddressSearch)
                        }}
                        onClose={() => setCurrentScreen(Screen.MapView)}
                    />
                )
            case Screen.AddressSearch:
                return <AddressSearch point={currentPoint} onClose={() => setCurrentScreen(Screen.SearchView)} />
            case Screen.MapView:
                return (
                    <MapView
                        points={query.queryPoints}
                        vehicle={query.routingVehicle}
                        onClick={() => setCurrentScreen(Screen.SearchView)}
                    />
                )
            default:
                return <span>Not yet implemented</span>
        }
    }
    // query results get only the selected path as result list. If we like having just one path on the small layout we can change
    // the store so that it will only fetch a single route on mobile
    return (
        <div className={styles.sidebar}>
            <div className={getClassNames(currentScreen)}>{getScreen()}</div>
            <div className={styles.background}>
                <QueryResults
                    paths={[route.selectedPath]}
                    selectedPath={route.selectedPath}
                    currentRequest={query.currentRequest}
                />
            </div>
        </div>
    )
}

function AddressSearch(props: { point: QueryPoint; onClose: () => void }) {
    return (
        <div className={styles.addressSearch}>
            <div className={styles.addressInputContainer}>
                <AddressInput
                    point={{
                        ...props.point,
                        queryText: '',
                    }}
                    autofocus={true}
                    onCancel={props.onClose}
                    onAddressSelected={hit => {
                        Dispatcher.dispatch(
                            new SetPoint({
                                ...props.point,
                                coordinate: hit.point,
                                isInitialized: true,
                                queryText: convertToQueryText(hit),
                            })
                        )
                        props.onClose()
                    }}
                    onChange={() => {}}
                    onFocus={() => {}}
                />
            </div>
            <button onClick={() => props.onClose()}>Cancel</button>
        </div>
    )
}

function SearchView(props: {
    points: QueryPoint[]
    routingVehicles: RoutingVehicle[]
    selectedVehicle: RoutingVehicle
    onFocus: (point: QueryPoint) => void
    onClose: () => void
}) {
    return (
        <div className={styles.btnCloseContainer}>
            <Search
                points={props.points}
                routingVehicles={props.routingVehicles}
                selectedVehicle={props.selectedVehicle}
                onFocus={props.onFocus}
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
            <MapViewPoint {...from} />
            <IntermediatePoint points={props.points} />
            <MapViewPoint {...to} />
        </div>
    )
}

// call this queryText, so that QueryPoints can be passed in as props because they have a fitting shape
function MapViewPoint({ queryText, color }: { queryText: string; color: string }) {
    return (
        <div className={styles.mapViewPoint}>
            <div className={styles.dot} style={{ backgroundColor: color }} />
            <span>{queryText}</span>
        </div>
    )
}

function IntermediatePoint({ points }: { points: QueryPoint[] }) {
    // for a total number of three points display intermediate via point
    if (points.length === 3) return <MapViewPoint {...points[1]} />

    // for more than total of three points display the number of via points
    if (points.length > 3) return <MapViewPoint queryText={points.length - 2 + ' via points'} color={'#76D0F7'} />

    return <div /> // in case of no via points display nothing
}

function getClassNames(screen: Screen) {
    switch (screen) {
        case Screen.AddressSearch:
            return styles.background + ' ' + styles.fullHeight
        case Screen.RouteView:
        case Screen.SearchView:
        case Screen.MapView:
        default:
            return styles.background
    }
}
