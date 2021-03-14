import React, { useEffect, useState } from 'react'
import Sidebar from '@/Sidebar'
import styles from './App.module.css'
import { getApiInfoStore, getQueryStore, getRouteStore } from '@/stores/Stores'
import MapComponent from '@/Map'
import { Bbox } from '@/routing/Api'

export default function App() {
    const [query, setQuery] = useState(getQueryStore().state)
    const [info, setInfo] = useState(getApiInfoStore().state)
    const [route, setRoute] = useState(getRouteStore().state)
    const [useInfoBbox, setUseInfoBbox] = useState(true)

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

    // only use the api info's bbox until any other bounding box was chosen. Is this too messy?
    const chooseBoundingBox = function (infoBbox: Bbox, pathBbox: Bbox, shouldUseInfoBbox: boolean) {
        if (shouldUseInfoBbox && pathBbox.every(num => num !== 0)) {
            setUseInfoBbox(false)
            return pathBbox
        } else if (shouldUseInfoBbox) return infoBbox
        return pathBbox
    }

    const bbox = chooseBoundingBox(info.bbox, route.selectedPath.bbox, useInfoBbox)

    return (
        <div className={styles.appWrapper}>
            <div className={styles.map}>
                <MapComponent queryPoints={query.queryPoints} path={route.selectedPath} bbox={bbox} />
            </div>
            <div className={styles.sidebar}>
                <div className={styles.sidebarContent}>
                    <Sidebar info={info} query={query} route={route} />
                </div>
            </div>
        </div>
    )
}
