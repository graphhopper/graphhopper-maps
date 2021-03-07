import React, { useEffect, useState } from 'react'
import Sidebar from '@/Sidebar'

import styles from './App.module.css'
import { getApiInfoStore, getQueryStore, getRouteStore } from '@/stores/Stores'
import MapComponent from '@/Map'

export default function App() {
    const [query, setQuery] = useState(getQueryStore().state)
    const [info, setInfo] = useState(getApiInfoStore().state)
    const [route, setRoute] = useState(getRouteStore().state)

    useEffect(() => {
        const onQueryChanged = () => setQuery(getQueryStore().state)
        const onInfoChanged = () => setInfo(getApiInfoStore().state)
        const onRouteChanged = () => setRoute(getRouteStore().state)

        getQueryStore().register(onQueryChanged)
        getApiInfoStore().register(onInfoChanged)
        getRouteStore().register(onRouteChanged)

        return () => {
            getQueryStore().deregister(onQueryChanged)
            getApiInfoStore().deregister(onInfoChanged)
            getRouteStore().deregister(onRouteChanged)
        }
    })

    const bbox = route.selectedPath.bbox.every(num => num !== 0) ? route.selectedPath.bbox : info.bbox
    return (
        <div className={styles.appWrapper}>
            <div className={styles.map}>
                <MapComponent queryPoints={query.queryPoints} path={route.selectedPath} bbox={bbox} />
            </div>
            <div className={styles.sidebar}>
                <div className={styles.sidebarContent}>
                    <Sidebar />
                </div>
            </div>
        </div>
    )
}
