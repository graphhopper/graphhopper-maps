import React from 'react'
import { RouteStoreState } from '@/stores/RouteStore'
import { QueryStoreState } from '@/stores/QueryStore'
import Search from '@/sidebar/search/Search'
import styles from '@/sidebar/Sidebar.module.css'
import Dispatcher from '@/stores/Dispatcher'
import { DismissLastError } from '@/actions/Actions'
import PlainButton from '@/PlainButton'
import Cross from './times-solid.svg'
import { ApiInfo } from '@/api/graphhopper'
import { ErrorStoreState } from '@/stores/ErrorStore'
import QueryResults from '@/sidebar/QueryResults'

type SidebarProps = {
    query: QueryStoreState
    route: RouteStoreState
    info: ApiInfo
    error: ErrorStoreState
}

export default function ({ query, route, info, error }: SidebarProps) {
    return (
        <div className={styles.sidebar}>
            {
                <Search
                    points={query.queryPoints}
                    routingVehicles={info.vehicles}
                    selectedVehicle={query.routingVehicle}
                    onFocus={() => {
                        /* nothing */
                    }}
                />
            }
            {!error.isDismissed && <ErrorMessage error={error} />}
            {route.routingResult.paths.length > 0 && (
                <QueryResults
                    paths={route.routingResult.paths}
                    selectedPath={route.selectedPath}
                    currentRequest={query.currentRequest}
                />
            )}
        </div>
    )
}

const ErrorMessage = function ({ error }: { error: ErrorStoreState }) {
    return (
        <div className={styles.errorMessageContainer}>
            <span className={styles.errorMessage}>{error.lastError}</span>
            <PlainButton
                className={styles.errorMessageCloseBtn}
                onClick={() => Dispatcher.dispatch(new DismissLastError())}
            >
                <Cross />
            </PlainButton>
        </div>
    )
}
