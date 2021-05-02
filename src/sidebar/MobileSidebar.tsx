import React, { useState } from 'react'
import { QueryPoint, QueryStoreState } from '@/stores/QueryStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { ApiInfo } from '@/api/graphhopper'
import { ErrorStoreState } from '@/stores/ErrorStore'
import styles from './MobileSidebar.module.css'
import NewSearch from '@/sidebar/newSearch/NewSearch'
import AddressInput from '@/sidebar/search/AddressInput'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint } from '@/actions/Actions'
import { convertToQueryText } from '@/Converters'

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
                    <NewSearch
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
                return (
                    <div className={styles.addressInput}>
                        <AddressInput
                            point={currentPoint}
                            autofocus={true}
                            onCancel={() => {
                                setCurrentScreen(Screen.SearchView)
                            }}
                            onAddressSelected={hit => {
                                console.log('on address selected')
                                Dispatcher.dispatch(
                                    new SetPoint({
                                        ...currentPoint,
                                        coordinate: hit.point,
                                        isInitialized: true,
                                        queryText: convertToQueryText(hit),
                                    })
                                )
                                setCurrentScreen(Screen.SearchView)
                            }}
                            onChange={value => console.log('on change: ' + value)}
                        />
                    </div>
                )
            default:
                return <span>Not yet implemented</span>
        }
    }
    return <div className={getClassNames(currentScreen)}>{getScreen()}</div>
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
