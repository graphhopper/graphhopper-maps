import React from 'react'
import { RouteStoreState } from '@/stores/RouteStore'
import { QueryStoreState } from '@/stores/QueryStore'
import Search from '@/sidebar/search/Search'
import styles from '@/sidebar/Sidebar.module.css'
import { ApiInfo } from '@/api/graphhopper'
import { ErrorStoreState } from '@/stores/ErrorStore'
import QueryResults from '@/sidebar/QueryResults'
import ErrorMessage from '@/sidebar/ErrorMessage'

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
