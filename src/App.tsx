import React, { useEffect, useState } from 'react'
import PathDetails from '@/pathDetails/PathDetails'
import styles from './App.module.css'
import {
    getApiInfoStore,
    getErrorStore,
    getMapOptionsStore,
    getMapStore,
    getPathDetailsStore,
    getQueryStore,
    getRouteStore,
} from '@/stores/Stores'
import MapComponent from '@/map/MapComponent'
import { ApiInfo } from '@/api/graphhopper'
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
import BackgroundLayer from '@/layers/BackgroundLayer'
import { MapStoreState } from '@/stores/MapStore'
import QueryPointsLayer from '@/layers/QueryPointsLayer'
import PathsLayer from '@/layers/PathsLayer'
import ContextMenu from '@/layers/ContextMenu'
import PathDetailsLayer from '@/layers/PathDetailsLayer'

export const POPUP_CONTAINER_ID = 'popup-container'
export const SIDEBAR_CONTENT_ID = 'sidebar-content'

export default function App() {
    const [query, setQuery] = useState(getQueryStore().state)
    const [info, setInfo] = useState(getApiInfoStore().state)
    const [route, setRoute] = useState(getRouteStore().state)
    const [error, setError] = useState(getErrorStore().state)
    const [mapOptions, setMapOptions] = useState(getMapOptionsStore().state)
    const [pathDetails, setPathDetails] = useState(getPathDetailsStore().state)
    const [map, setMap] = useState(getMapStore().state)

    useEffect(() => {
        const onQueryChanged = () => setQuery(getQueryStore().state)
        const onInfoChanged = () => setInfo(getApiInfoStore().state)
        const onRouteChanged = () => setRoute(getRouteStore().state)
        const onErrorChanged = () => setError(getErrorStore().state)
        const onMapOptionsChanged = () => setMapOptions(getMapOptionsStore().state)
        const onPathDetailsChanged = () => setPathDetails(getPathDetailsStore().state)
        const onMapChanged = () => setMap(getMapStore().state)

        getQueryStore().register(onQueryChanged)
        getApiInfoStore().register(onInfoChanged)
        getRouteStore().register(onRouteChanged)
        getErrorStore().register(onErrorChanged)
        getMapOptionsStore().register(onMapOptionsChanged)
        getPathDetailsStore().register(onPathDetailsChanged)
        getMapStore().register(onMapChanged)

        return () => {
            getQueryStore().deregister(onQueryChanged)
            getApiInfoStore().deregister(onInfoChanged)
            getRouteStore().deregister(onRouteChanged)
            getErrorStore().deregister(onErrorChanged)
            getMapOptionsStore().deregister(onMapOptionsChanged)
            getPathDetailsStore().deregister(onPathDetailsChanged)
            getMapStore().deregister(onMapChanged)
        }
    })

    const isSmallScreen = useMediaQuery({ query: '(max-width: 44rem)' })
    return (
        <div className={styles.appWrapper}>
            {/* todo: maybe the map layers do not need to be components at all and all they really are are useEffects that
                update depending on some of the app state (like query points, selectedPath etc.))*/}
            <BackgroundLayer map={map.map} styleOption={mapOptions.selectedStyle} />
            <PathsLayer map={map.map} paths={route.routingResult.paths} selectedPath={route.selectedPath} />
            <QueryPointsLayer map={map.map} queryPoints={query.queryPoints} />
            {/*todo: hide path details layer for small screens*/}
            <PathDetailsLayer map={map.map} pathDetails={pathDetails} />
            <ContextMenu map={map.map} route={route} queryPoints={query.queryPoints} />
            {isSmallScreen ? (
                <SmallScreenLayout
                    query={query}
                    route={route}
                    map={map}
                    mapOptions={mapOptions}
                    error={error}
                    info={info}
                />
            ) : (
                <LargeScreenLayout
                    query={query}
                    route={route}
                    map={map}
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
    map: MapStoreState
    mapOptions: MapOptionsStoreState
    error: ErrorStoreState
    info: ApiInfo
}

function LargeScreenLayout({ query, route, map, error, mapOptions, info }: LayoutProps) {
    return (
        <>
            <div className={styles.sidebar}>
                <div className={styles.sidebarContent} id={SIDEBAR_CONTENT_ID}>
                    <Search
                        points={query.queryPoints}
                        routingProfiles={info.profiles}
                        selectedProfile={query.routingProfile}
                        autofocus={false}
                    />
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
            <div className={styles.popupContainer} id={POPUP_CONTAINER_ID} />
            <div className={styles.map}>
                <MapComponent map={map.map} />
            </div>
            <div className={styles.mapOptions}>
                <MapOptions {...mapOptions} />
            </div>

            <div className={styles.pathDetails}>
                <PathDetails selectedPath={route.selectedPath} />
            </div>
        </>
    )
}

function SmallScreenLayout({ query, route, map, error, mapOptions, info }: LayoutProps) {
    return (
        <>
            <div className={styles.smallScreenSidebar}>
                <MobileSidebar info={info} query={query} route={route} error={error} />
            </div>
            <div className={styles.smallScreenMap}>
                <MapComponent map={map.map} />
            </div>
            <div className={styles.smallScreenMapOptions}>
                <div className={styles.smallScreenMapOptionsContent}>
                    <MapOptions {...mapOptions} />
                </div>
            </div>

            <div className={styles.smallScreenRoutingResult}>
                <RoutingResults
                    paths={route.routingResult.paths}
                    selectedPath={route.selectedPath}
                    currentRequest={query.currentRequest}
                />
            </div>

            <div className={styles.smallScreenPoweredBy}>
                <PoweredBy />
            </div>
        </>
    )
}
