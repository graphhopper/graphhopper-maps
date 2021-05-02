import React, { useState } from 'react'
import { QueryPoint, QueryStoreState } from '@/stores/QueryStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { ApiInfo } from '@/api/graphhopper'
import { ErrorStoreState } from '@/stores/ErrorStore'
import styles from './MobileSidebar.module.css'
import AddressInput from '@/sidebar/search/AddressInput'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint } from '@/actions/Actions'
import { convertToQueryText } from '@/Converters'
import Search from '@/sidebar/search/Search'

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
    const [currentPoint, setCurrentPoint] = useState<QueryPoint>(query.queryPoints[0])

    const getScreen = function () {
        switch (currentScreen) {
            case Screen.SearchView:
                return (
                    <Search
                        points={query.queryPoints}
                        routingVehicles={info.vehicles}
                        selectedVehicle={query.routingVehicle}
                        onFocus={point => {
                            setCurrentPoint(point)
                            setCurrentScreen(Screen.AddressSearch)
                        }}
                    />
                )
            case Screen.AddressSearch:
                return <AddressSearch point={currentPoint} onClose={() => setCurrentScreen(Screen.SearchView)} />
            default:
                return <span>Not yet implemented</span>
        }
    }
    return <div className={getClassNames(currentScreen)}>{getScreen()}</div>
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

function getClassNames(screen: Screen) {
    switch (screen) {
        case Screen.AddressSearch:
        case Screen.RouteView:
            return styles.sidebar + ' ' + styles.fullHeight
        case Screen.SearchView:
        case Screen.MapView:
        default:
            return styles.sidebar
    }
}
