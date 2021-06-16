import React, { useEffect, useState } from 'react'
import PathDetails from '@/pathDetails/PathDetails'
import styles from './App.module.css'
import {
    getApiInfoStore,
    getErrorStore,
    getMapLayerStore,
    getMapOptionsStore,
    getPathDetailsStore,
    getQueryStore,
    getRouteStore,
    getViewportStore,
} from '@/stores/Stores'
import MapComponent from '@/map/Map'
import { ApiInfo } from '@/api/graphhopper'
import MapOptions from '@/map/MapOptions'
import MobileSidebar from '@/sidebar/MobileSidebar'
import { useMediaQuery } from 'react-responsive'
import RoutingResults from '@/sidebar/RoutingResults'
import PoweredBy from '@/sidebar/PoweredBy'
import { Coordinate, QueryStoreState } from '@/stores/QueryStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { MapOptionsStoreState } from '@/stores/MapOptionsStore'
import { ErrorStoreState } from '@/stores/ErrorStore'
import Search from '@/sidebar/search/Search'
import ErrorMessage from '@/sidebar/ErrorMessage'
import { ViewportStoreState } from '@/stores/ViewportStore'
import Dispatcher from '@/stores/Dispatcher'
import { SetSelectedPath, SetViewportToBbox } from '@/actions/Actions'
import { MapLayer } from '@/stores/MapLayerStore'
import PathDetailsLayer from '@/layers/PathDetailsLayer'
import QueryPointsLayer from '@/layers/QueryPointsLayer'
import ContextMenuLayer from '@/layers/ContextMenuLayer'
import PathsLayer, { getCurrentPaths, getInteractiveLayerIds, pathsLayerKey } from '@/layers/PathsLayer'

export default function App() {
    const [query, setQuery] = useState(getQueryStore().state)
    const [info, setInfo] = useState(getApiInfoStore().state)
    const [route, setRoute] = useState(getRouteStore().state)
    const [error, setError] = useState(getErrorStore().state)
    const [mapOptions, setMapOptions] = useState(getMapOptionsStore().state)
    const [pathDetails, setPathDetails] = useState(getPathDetailsStore().state)
    const [viewport, setViewport] = useState(getViewportStore().state)
    const [mapLayers, setMapLayers] = useState(getMapLayerStore().state)

    useEffect(() => {
        const onQueryChanged = () => setQuery(getQueryStore().state)
        const onInfoChanged = () => setInfo(getApiInfoStore().state)
        const onRouteChanged = () => setRoute(getRouteStore().state)
        const onErrorChanged = () => setError(getErrorStore().state)
        const onMapOptionsChanged = () => setMapOptions(getMapOptionsStore().state)
        const onPathDetailsChanged = () => setPathDetails(getPathDetailsStore().state)
        const onViewportChanged = () => setViewport(getViewportStore().state)
        const onMapLayersChanged = () => setMapLayers(getMapLayerStore().state)

        getQueryStore().register(onQueryChanged)
        getApiInfoStore().register(onInfoChanged)
        getRouteStore().register(onRouteChanged)
        getErrorStore().register(onErrorChanged)
        getMapOptionsStore().register(onMapOptionsChanged)
        getPathDetailsStore().register(onPathDetailsChanged)
        getViewportStore().register(onViewportChanged)
        getMapLayerStore().register(onMapLayersChanged)

        return () => {
            getQueryStore().deregister(onQueryChanged)
            getApiInfoStore().deregister(onInfoChanged)
            getRouteStore().deregister(onRouteChanged)
            getErrorStore().deregister(onErrorChanged)
            getMapOptionsStore().deregister(onMapOptionsChanged)
            getPathDetailsStore().deregister(onPathDetailsChanged)
            getViewportStore().deregister(onViewportChanged)
            getMapLayerStore().deregister(onMapLayersChanged)
        }
    })

    const isSmallScreen = useMediaQuery({ query: '(max-width: 44rem)' })
    // todo: maybe combine these effects into one? see discussion in #77
    useEffect(() => {
        // make sure the path bbox and the path details bbox take precedence over the info bbox
        if (!route.selectedPath.bbox && !pathDetails.pathDetailBbox)
            Dispatcher.dispatch(new SetViewportToBbox(info.bbox))
    }, [info])
    useEffect(() => {
        // make sure the path details bbox takes precedence over the route bbox
        if (route.selectedPath.bbox && !pathDetails.pathDetailBbox)
            Dispatcher.dispatch(new SetViewportToBbox(route.selectedPath.bbox))
    }, [route])
    useEffect(() => {
        // make sure the path details bbox takes precedence over the path and info bboxes
        if (pathDetails.pathDetailBbox) Dispatcher.dispatch(new SetViewportToBbox(pathDetails.pathDetailBbox))
        else if (route.selectedPath.bbox) Dispatcher.dispatch(new SetViewportToBbox(route.selectedPath.bbox))
    }, [pathDetails])

    const [popupCoordinate, setPopupCoordinate] = useState<Coordinate | null>(null)
    const theMapLayers: { [key: string]: MapLayer } = {
        'context-menu-layer': {
            id: 'context-menu-layer',
            interactiveLayerIds: [],
            onClick: () => {},
            layer: (
                <ContextMenuLayer
                    queryPoints={query.queryPoints}
                    popupCoordinate={popupCoordinate}
                    setPopupCoordinate={setPopupCoordinate}
                />
            ),
        },
        'query-points-layer': {
            id: 'query-points-layer',
            interactiveLayerIds: [],
            onClick: () => {},
            layer: <QueryPointsLayer queryPoints={query.queryPoints} />,
        },
        'paths-layer': {
            id: 'paths-layer',
            interactiveLayerIds: getInteractiveLayerIds(route.selectedPath, route.routingResult.paths),
            onClick: feature => {
                // select an alternative path if clicked
                if (feature.layer.id === pathsLayerKey) {
                    const index = feature.properties!.index
                    const path = getCurrentPaths(route.selectedPath, route.routingResult.paths).find(
                        indexPath => indexPath.index === index
                    )
                    Dispatcher.dispatch(new SetSelectedPath(path!.path))
                }
            },
            layer: <PathsLayer selectedPath={route.selectedPath} paths={route.routingResult.paths} />,
        },
        'path-details-layer': {
            id: 'path-details-layer',
            interactiveLayerIds: [],
            onClick: () => {},
            layer: (
                <PathDetailsLayer
                    pathDetailPoint={pathDetails.pathDetailsPoint}
                    highlightedPathDetailSegments={pathDetails.pathDetailsHighlightedSegments}
                />
            ),
        },
    }

    return (
        <div className={styles.appWrapper}>
            {isSmallScreen ? (
                <SmallScreenLayout
                    query={query}
                    route={route}
                    viewport={viewport}
                    theMapLayers={theMapLayers}
                    setPopupCoordinate={setPopupCoordinate}
                    mapOptions={mapOptions}
                    error={error}
                    info={info}
                />
            ) : (
                <LargeScreenLayout
                    query={query}
                    route={route}
                    viewport={viewport}
                    theMapLayers={theMapLayers}
                    setPopupCoordinate={setPopupCoordinate}
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
    viewport: ViewportStoreState
    theMapLayers: { [key: string]: MapLayer }
    setPopupCoordinate: (c: Coordinate | null) => void
    mapOptions: MapOptionsStoreState
    error: ErrorStoreState
    info: ApiInfo
}

function LargeScreenLayout({
    query,
    route,
    viewport,
    theMapLayers,
    setPopupCoordinate,
    error,
    mapOptions,
    info,
}: LayoutProps) {
    return (
        <>
            <div className={styles.map}>
                {
                    <MapComponent
                        viewport={viewport}
                        mapStyle={mapOptions.selectedStyle}
                        mapLayers={theMapLayers}
                        setPopupCoordinate={setPopupCoordinate}
                    />
                }
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
            <div className={styles.pathDetails}>
                <PathDetails selectedPath={route.selectedPath} />
            </div>
        </>
    )
}

function SmallScreenLayout({
    query,
    route,
    viewport,
    theMapLayers,
    setPopupCoordinate,
    error,
    mapOptions,
    info,
}: LayoutProps) {
    return (
        <>
            <div className={styles.smallScreenMap}>
                <MapComponent
                    viewport={viewport}
                    mapStyle={mapOptions.selectedStyle}
                    mapLayers={theMapLayers}
                    setPopupCoordinate={setPopupCoordinate}
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

            <div className={styles.smallScreenPoweredBy}>
                <PoweredBy />
            </div>
        </>
    )
}
