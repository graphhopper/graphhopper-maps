import React, { useEffect, useState } from 'react'
import Sidebar from '@/sidebar/Sidebar'
import styles from './App.module.css'
import { getApiInfoStore, getErrorStore, getMapOptionsStore, getQueryStore, getCurrentLocationStore, getRouteStore } from '@/stores/Stores'
import MapComponent from '@/map/Map'
import { Bbox } from '@/api/graphhopper'
import MapOptions from '@/map/MapOptions'

export default function App() {
    const [query, setQuery] = useState(getQueryStore().state)
    const [currentLocation, setCurrentLocation] = useState(getCurrentLocationStore().state)
    const [info, setInfo] = useState(getApiInfoStore().state)
    const [route, setRoute] = useState(getRouteStore().state)
    const [error, setError] = useState(getErrorStore().state)
    const [mapOptions, setMapOptions] = useState(getMapOptionsStore().state)
    const [useInfoBbox, setUseInfoBbox] = useState(true)

    useEffect(() => {
        const onQueryChanged = () => setQuery(getQueryStore().state)
        const onCurrentLocationChanged = () => setCurrentLocation(getCurrentLocationStore().state)
        const onInfoChanged = () => setInfo(getApiInfoStore().state)
        const onRouteChanged = () => setRoute(getRouteStore().state)
        const onErrorChanged = () => setError(getErrorStore().state)
        const onMapOptionsChanged = () => setMapOptions(getMapOptionsStore().state)

        getQueryStore().register(onQueryChanged)
        getCurrentLocationStore().register(onCurrentLocationChanged)
        getApiInfoStore().register(onInfoChanged)
        getRouteStore().register(onRouteChanged)
        getErrorStore().register(onErrorChanged)
        getMapOptionsStore().register(onMapOptionsChanged)

        return () => {
            getQueryStore().deregister(onQueryChanged)
            getCurrentLocationStore().deregister(onCurrentLocationChanged)
            getApiInfoStore().deregister(onInfoChanged)
            getRouteStore().deregister(onRouteChanged)
            getErrorStore().deregister(onErrorChanged)
            getMapOptionsStore().deregister(onMapOptionsChanged)
        }
    })

    // only use the api info's bbox until any other bounding box was chosen. Is this too messy?
    const chooseBoundingBox = function (infoBbox: Bbox, shouldUseInfoBbox: boolean, pathBbox?: Bbox) {
        pathBbox = [0, 0, 0, 0]
        shouldUseInfoBbox = true
        if (shouldUseInfoBbox && pathBbox && pathBbox.every(num => num !== 0)) {
            console.log("NOW disable info bbox")
            setUseInfoBbox(false)
            return pathBbox
        } else if (shouldUseInfoBbox) return infoBbox
        return pathBbox || [0, 0, 0, 0]
    }

    const bbox = chooseBoundingBox(info.bbox, useInfoBbox, route.selectedPath.bbox)

    return (
        <div className={styles.appWrapper}>
            <div className={styles.map}>
                <MapComponent
                    queryPoints={query.queryPoints}
                    paths={route.routingResult.paths}
                    selectedPath={route.selectedPath}
                    bbox={bbox}
                    mapStyle={mapOptions.selectedStyle}
                />
            </div>
            <div className={styles.sidebar}>
                <div className={styles.sidebarContent}>
                    <Sidebar info={info} query={query} route={route} error={error} />
                    <div className={styles.navi} onClick={() => getRouteStore().startNavigation(getCurrentLocationStore())}>
                        Start Navigation
                    </div>
                </div>
            </div>
            <div className={styles.mapOptions}>
                <div className={styles.mapOptionsContent}>
                    <MapOptions {...mapOptions} />
                </div>
            </div>
        </div>
    )
}
