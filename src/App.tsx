import React, { useEffect, useState } from 'react'
import TurnNavigation from '@/turnNavigation/TurnNavigation'
import styles from './App.module.css'
import {
    getApiInfoStore,
    getErrorStore,
    getMapOptionsStore,
    getQueryStore,
    getRouteStore,
    getLocationStore,
} from '@/stores/Stores'
import MapComponent from '@/map/Map'
import { ApiInfo, Bbox } from '@/api/graphhopper'
import MapOptions from '@/map/MapOptions'
import MobileSidebar from '@/sidebar/MobileSidebar'
import { useMediaQuery } from 'react-responsive'
import RoutingResults from '@/sidebar/RoutingResults'
import PoweredBy from '@/sidebar/PoweredBy'
import { QueryStoreState } from '@/stores/QueryStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { MapOptionsStoreState } from '@/stores/MapOptionsStore'
import { ErrorStoreState } from '@/stores/ErrorStore'
import Search from '@/sidebar/search/Search'
import ErrorMessage from '@/sidebar/ErrorMessage'

export default function App() {
    const [query, setQuery] = useState(getQueryStore().state)
    const [info, setInfo] = useState(getApiInfoStore().state)
    const [route, setRoute] = useState(getRouteStore().state)
    const [location, setLocation] = useState(getLocationStore().state)
    const [error, setError] = useState(getErrorStore().state)
    const [mapOptions, setMapOptions] = useState(getMapOptionsStore().state)
    const [useInfoBbox, setUseInfoBbox] = useState(true)

    useEffect(() => {
        const onQueryChanged = () => setQuery(getQueryStore().state)
        const onInfoChanged = () => setInfo(getApiInfoStore().state)
        const onRouteChanged = () => setRoute(getRouteStore().state)
        const onErrorChanged = () => setError(getErrorStore().state)
        const onMapOptionsChanged = () => setMapOptions(getMapOptionsStore().state)
        const onLocationChanged = () => setLocation(getLocationStore().state)

        getQueryStore().register(onQueryChanged)
        getApiInfoStore().register(onInfoChanged)
        getRouteStore().register(onRouteChanged)
        getErrorStore().register(onErrorChanged)
        getMapOptionsStore().register(onMapOptionsChanged)
        getLocationStore().register(onLocationChanged)

        return () => {
            getQueryStore().deregister(onQueryChanged)
            getApiInfoStore().deregister(onInfoChanged)
            getRouteStore().deregister(onRouteChanged)
            getErrorStore().deregister(onErrorChanged)
            getMapOptionsStore().deregister(onMapOptionsChanged)
            getLocationStore().deregister(onLocationChanged)
        }
    })

    const isSmallScreen = useMediaQuery({ query: '(max-width: 44rem)' })

    // only use the api info's bbox until any other bounding box was chosen. Is this too messy?
    const chooseBoundingBox = function (infoBbox: Bbox, shouldUseInfoBbox: boolean, pathBbox?: Bbox) {
        if (shouldUseInfoBbox && pathBbox && pathBbox.every(num => num !== 0)) {
            setUseInfoBbox(false)
            return pathBbox
        } else if (shouldUseInfoBbox) return infoBbox
        return pathBbox || [0, 0, 0, 0]
    }

    const bbox = chooseBoundingBox(info.bbox, useInfoBbox, route.selectedPath.bbox)
    if (location.turnNavigation)
        return (
            <div className={styles.appWrapper}>
                <div className={styles.smallScreenMap}>
                    <MapComponent
                        queryPoints={query.queryPoints}
                        paths={route.routingResult.paths}
                        selectedPath={route.selectedPath}
                        bbox={bbox}
                        mapStyle={mapOptions.selectedStyle}
                        location={location}
                    />
                </div>
                <div className={styles.turnNavigation}>
                    <TurnNavigation path={route.selectedPath} currentLocation={location.coordinate} />
                </div>
                <div className={styles.smallScreenRoutingResult}>
                    <RoutingResults
                        paths={route.routingResult.paths}
                        selectedPath={route.selectedPath}
                        currentRequest={query.currentRequest}
                    />
                </div>
            </div>
        )

    return (
        <div className={styles.appWrapper}>
            {isSmallScreen ? (
                <SmallScreenLayout
                    query={query}
                    route={route}
                    bbox={bbox}
                    mapOptions={mapOptions}
                    error={error}
                    info={info}
                />
            ) : (
                <LargeScreenLayout
                    query={query}
                    route={route}
                    bbox={bbox}
                    mapOptions={mapOptions}
                    error={error}
                    info={info}
                />
            )}
        </div>
    )
}

interface LayoutProps {
    query: QueryStoreState
    route: RouteStoreState
    bbox: Bbox
    mapOptions: MapOptionsStoreState
    error: ErrorStoreState
    info: ApiInfo
}

function LargeScreenLayout({ query, route, bbox, error, mapOptions, info }: LayoutProps) {
    return (
        <>
            <div className={styles.map}>
                <MapComponent
                    queryPoints={query.queryPoints}
                    paths={route.routingResult.paths}
                    selectedPath={route.selectedPath}
                    bbox={bbox}
                    mapStyle={mapOptions.selectedStyle}
                />
            </div>
            <div className={styles.mapOptions}>
                <MapOptions {...mapOptions} />
            </div>
            <div className={styles.sidebar}>
                <div className={styles.sidebarContent}>
                    <div className={styles.search}>
                        <Search
                            points={query.queryPoints}
                            routingProfiles={info.profiles}
                            selectedProfile={query.routingProfile}
                        />
                    </div>
                    <div>{!error.isDismissed && <ErrorMessage error={error} />}</div>
                    <div className={styles.routingResult}>
                        <RoutingResults
                            paths={route.routingResult.paths}
                            selectedPath={route.selectedPath}
                            currentRequest={query.currentRequest}
                        />
                    </div>
                    <div className={styles.poweredBy}>
                        <PoweredBy />
                    </div>
                </div>
            </div>
        </>
    )
}

function SmallScreenLayout({ query, route, bbox, error, mapOptions, info }: LayoutProps) {
    return (
        <>
            <div className={styles.smallScreenMap}>
                <MapComponent
                    queryPoints={query.queryPoints}
                    paths={route.routingResult.paths}
                    selectedPath={route.selectedPath}
                    bbox={bbox}
                    mapStyle={mapOptions.selectedStyle}
                />
            </div>
            <div className={styles.smallScreenMapOptions}>
                <div className={styles.smallScreenMapOptionsContent}>
                    <MapOptions {...mapOptions} />
                </div>
            </div>
            <div className={styles.smallScreenSidebar}>
                <MobileSidebar info={info} query={query} route={route} error={error} />
            </div>
            <div className={styles.smallScreenRoutingResult}>
                <RoutingResults
                    paths={route.routingResult.paths}
                    selectedPath={route.selectedPath}
                    currentRequest={query.currentRequest}
                />
            </div>

            <div className={styles.smallSreenPoweredBy}>
                <PoweredBy />
            </div>
        </>
    )
}
