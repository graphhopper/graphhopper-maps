import { useEffect, useState } from 'react'
import ElevationInfoBar from '@/pathDetails/ElevationInfoBar'
import { ChartPathDetail } from '@/pathDetails/elevationWidget/types'
import styles from './App.module.css'
import {
    getApiInfoStore,
    getErrorStore,
    getMapFeatureStore,
    getMapOptionsStore,
    getPathDetailsStore,
    getPOIsStore,
    getQueryStore,
    getRouteStore,
    getSettingsStore,
    getCurrentLocationStore,
} from '@/stores/Stores'
import MapComponent from '@/map/MapComponent'
import mapStyles from '@/map/Map.module.css'
import MapOptions from '@/map/MapOptions'
import MobileSidebar from '@/sidebar/MobileSidebar'
import { useMediaQuery } from 'react-responsive'
import RoutingResults from '@/sidebar/RoutingResults'
import PoweredBy from '@/sidebar/PoweredBy'
import { QueryStoreState, RequestState } from '@/stores/QueryStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { MapOptionsStoreState } from '@/stores/MapOptionsStore'
import { ErrorStoreState } from '@/stores/ErrorStore'
import { CurrentLocationStoreState } from '@/stores/CurrentLocationStore'
import Search from '@/sidebar/search/Search'
import ErrorMessage from '@/sidebar/ErrorMessage'
import useBackgroundLayer from '@/layers/UseBackgroundLayer'
import useQueryPointsLayer from '@/layers/UseQueryPointsLayer'
import usePathsLayer from '@/layers/UsePathsLayer'
import ContextMenu from '@/layers/ContextMenu'
import usePathDetailsLayer from '@/layers/UsePathDetailsLayer'
import { Map } from 'ol'
import { getMap } from '@/map/map'
import CustomModelBox from '@/sidebar/CustomModelBox'
import useRoutingGraphLayer from '@/layers/UseRoutingGraphLayer'
import useUrbanDensityLayer from '@/layers/UseUrbanDensityLayer'
import useMapBorderLayer from '@/layers/UseMapBorderLayer'
import RoutingProfiles from '@/sidebar/search/routingProfiles/RoutingProfiles'
import MapPopups from '@/map/MapPopups'
import Menu from '@/sidebar/menu.svg'
import Cross from '@/sidebar/times-solid.svg'
import PlainButton from '@/PlainButton'
import useAreasLayer from '@/layers/UseAreasLayer'
import useExternalMVTLayer from '@/layers/UseExternalMVTLayer'
import LocationButton from '@/map/LocationButton'
import { SettingsContext } from '@/contexts/SettingsContext'
import usePOIsLayer from '@/layers/UsePOIsLayer'
import useCurrentLocationLayer from '@/layers/UseCurrentLocationLayer'

export const POPUP_CONTAINER_ID = 'popup-container'
export const SIDEBAR_CONTENT_ID = 'sidebar-content'

export default function App() {
    const [settings, setSettings] = useState(getSettingsStore().state)
    const [query, setQuery] = useState(getQueryStore().state)
    const [info, setInfo] = useState(getApiInfoStore().state)
    const [route, setRoute] = useState(getRouteStore().state)
    const [error, setError] = useState(getErrorStore().state)
    const [mapOptions, setMapOptions] = useState(getMapOptionsStore().state)
    const [pathDetails, setPathDetails] = useState(getPathDetailsStore().state)
    const [mapFeatures, setMapFeatures] = useState(getMapFeatureStore().state)
    const [pois, setPOIs] = useState(getPOIsStore().state)
    const [currentLocation, setCurrentLocation] = useState(getCurrentLocationStore().state)

    const map = getMap()

    useEffect(() => {
        const onSettingsChanged = () => setSettings(getSettingsStore().state)
        const onQueryChanged = () => setQuery(getQueryStore().state)
        const onInfoChanged = () => setInfo(getApiInfoStore().state)
        const onRouteChanged = () => setRoute(getRouteStore().state)
        const onErrorChanged = () => setError(getErrorStore().state)
        const onMapOptionsChanged = () => setMapOptions(getMapOptionsStore().state)
        const onPathDetailsChanged = () => setPathDetails(getPathDetailsStore().state)
        const onMapFeaturesChanged = () => setMapFeatures(getMapFeatureStore().state)
        const onPOIsChanged = () => setPOIs(getPOIsStore().state)
        const onCurrentLocationChanged = () => setCurrentLocation(getCurrentLocationStore().state)

        getSettingsStore().register(onSettingsChanged)
        getQueryStore().register(onQueryChanged)
        getApiInfoStore().register(onInfoChanged)
        getRouteStore().register(onRouteChanged)
        getErrorStore().register(onErrorChanged)
        getMapOptionsStore().register(onMapOptionsChanged)
        getPathDetailsStore().register(onPathDetailsChanged)
        getMapFeatureStore().register(onMapFeaturesChanged)
        getPOIsStore().register(onPOIsChanged)
        getCurrentLocationStore().register(onCurrentLocationChanged)

        onQueryChanged()
        onInfoChanged()
        onRouteChanged()
        onErrorChanged()
        onMapOptionsChanged()
        onPathDetailsChanged()
        onMapFeaturesChanged()
        onPOIsChanged()
        onCurrentLocationChanged()

        return () => {
            getSettingsStore().deregister(onSettingsChanged)
            getQueryStore().deregister(onQueryChanged)
            getApiInfoStore().deregister(onInfoChanged)
            getRouteStore().deregister(onRouteChanged)
            getErrorStore().deregister(onErrorChanged)
            getMapOptionsStore().deregister(onMapOptionsChanged)
            getPathDetailsStore().deregister(onPathDetailsChanged)
            getMapFeatureStore().deregister(onMapFeaturesChanged)
            getPOIsStore().deregister(onPOIsChanged)
            getCurrentLocationStore().deregister(onCurrentLocationChanged)
        }
    }, [])

    // our different map layers
    useBackgroundLayer(map, mapOptions.selectedStyle)
    useExternalMVTLayer(map, mapOptions.externalMVTEnabled)
    useMapBorderLayer(map, info.bbox)
    useAreasLayer(map, settings.drawAreasEnabled, query.customModelStr, query.customModelEnabled)
    useRoutingGraphLayer(map, mapOptions.routingGraphEnabled)
    useUrbanDensityLayer(map, mapOptions.urbanDensityEnabled)
    usePathsLayer(map, route.routingResult.paths, route.selectedPath, query.queryPoints)
    useQueryPointsLayer(map, query.queryPoints)
    const [activeDetail, setActiveDetail] = useState<ChartPathDetail | null>(null)
    usePathDetailsLayer(map, pathDetails, activeDetail)
    usePOIsLayer(map, pois)
    useCurrentLocationLayer(map, currentLocation)

    const isSmallScreen = useMediaQuery({ query: '(max-width: 44rem)' })
    return (
        <SettingsContext.Provider value={settings}>
            <div className={styles.appWrapper}>
                <MapPopups
                    map={map}
                    pathDetails={pathDetails}
                    mapFeatures={mapFeatures}
                    poiState={pois}
                    query={query}
                />
                <ContextMenu map={map} route={route} queryPoints={query.queryPoints} />
                {isSmallScreen ? (
                    <SmallScreenLayout
                        query={query}
                        route={route}
                        map={map}
                        mapOptions={mapOptions}
                        error={error}
                        encodedValues={info.encoded_values}
                        drawAreas={settings.drawAreasEnabled}
                        currentLocation={currentLocation}
                        onActiveDetailChanged={setActiveDetail}
                    />
                ) : (
                    <LargeScreenLayout
                        query={query}
                        route={route}
                        map={map}
                        mapOptions={mapOptions}
                        error={error}
                        encodedValues={info.encoded_values}
                        drawAreas={settings.drawAreasEnabled}
                        currentLocation={currentLocation}
                        onActiveDetailChanged={setActiveDetail}
                    />
                )}
            </div>
        </SettingsContext.Provider>
    )
}

interface LayoutProps {
    query: QueryStoreState
    route: RouteStoreState
    map: Map
    mapOptions: MapOptionsStoreState
    currentLocation: CurrentLocationStoreState
    error: ErrorStoreState
    encodedValues: object[]
    drawAreas: boolean
    onActiveDetailChanged: (detail: ChartPathDetail | null) => void
}

function LargeScreenLayout({
    query,
    route,
    map,
    error,
    mapOptions,
    encodedValues,
    drawAreas,
    currentLocation,
    onActiveDetailChanged,
}: LayoutProps) {
    const [showSidebar, setShowSidebar] = useState(true)
    const [showCustomModelBox, setShowCustomModelBox] = useState(false)
    // 'compact' | 'expanded' | 'closed'
    const [elevationState, setElevationState] = useState<'compact' | 'expanded' | 'closed'>('compact')
    // Re-show elevation widget when a new route is calculated (only if currently closed)
    useEffect(() => { setElevationState(s => s === 'closed' ? 'compact' : s) }, [route.selectedPath])
    // Hide map attribution when elevation widget is expanded (it would be covered)
    useEffect(() => {
        const el = map.getTargetElement()?.querySelector('.' + mapStyles.customAttribution) as HTMLElement | null
        if (el) el.style.display = elevationState === 'expanded' ? 'none' : ''
    }, [elevationState, map])
    const hasRoute = route.selectedPath.points.coordinates.length > 0
    return (
        <>
            {showSidebar ? (
                <div className={styles.sidebar}>
                    <div className={styles.sidebarContent} id={SIDEBAR_CONTENT_ID}>
                        <PlainButton onClick={() => setShowSidebar(false)} className={styles.sidebarCloseButton}>
                            <Cross />
                        </PlainButton>
                        <RoutingProfiles
                            routingProfiles={query.profiles}
                            selectedProfile={query.routingProfile}
                            memorizedProfilePerGroup={query.memorizedProfilePerGroup}
                            showCustomModelBox={showCustomModelBox}
                            toggleCustomModelBox={() => setShowCustomModelBox(!showCustomModelBox)}
                            customModelBoxEnabled={query.customModelEnabled}
                        />
                        {showCustomModelBox && (
                            <CustomModelBox
                                customModelEnabled={query.customModelEnabled}
                                encodedValues={encodedValues}
                                customModelStr={query.customModelStr}
                                queryOngoing={query.currentRequest.subRequests[0]?.state === RequestState.SENT}
                                drawAreas={drawAreas}
                            />
                        )}
                        <Search points={query.queryPoints} profile={query.routingProfile} map={map} />
                        <div>{!error.isDismissed && <ErrorMessage error={error} />}</div>
                        <RoutingResults
                            info={route.routingResult.info}
                            paths={route.routingResult.paths}
                            selectedPath={route.selectedPath}
                            currentRequest={query.currentRequest}
                            profile={query.routingProfile.name}
                        />
                        <div>
                            <PoweredBy />
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.sidebarWhenClosed} onClick={() => setShowSidebar(true)}>
                    <PlainButton className={styles.sidebarOpenButton}>
                        <Menu />
                    </PlainButton>
                </div>
            )}
            <div className={styles.popupContainer} id={POPUP_CONTAINER_ID} />
            <div className={styles.onMapRightSide}>
                <MapOptions {...mapOptions} />
                <LocationButton currentLocation={currentLocation} />
            </div>
            <div className={styles.map}>
                <MapComponent map={map} />
            </div>

            {elevationState === 'closed' && hasRoute && (
                <div className={styles.pathDetails}>
                    <button
                        className={styles.elevationReopenButton}
                        onClick={() => setElevationState('compact')}
                        title="Show elevation"
                    >
                        <svg width="16" height="16" viewBox="0 0 1792 1792" fill="#666">
                            <path d="M1920 1536v128h-2048v-1536h128v1408h1920zm-384-1024l256 896h-1664v-576l448-576 576 576z"/>
                        </svg>
                    </button>
                </div>
            )}
            <div className={elevationState === 'expanded' ? styles.pathDetailsExpanded : styles.pathDetails}
                 style={{ display: elevationState === 'closed' ? 'none' : undefined }}>
                <ElevationInfoBar
                    selectedPath={route.selectedPath}
                    alternativePaths={route.routingResult.paths}
                    profile={query.routingProfile.name}
                    isExpanded={elevationState === 'expanded'}
                    onToggleExpanded={() => setElevationState(s => s === 'expanded' ? 'compact' : 'expanded')}
                    onClose={() => setElevationState('closed')}
                    onActiveDetailChanged={onActiveDetailChanged}
                />
            </div>
        </>
    )
}

function SmallScreenLayout({
    query,
    route,
    map,
    error,
    mapOptions,
    encodedValues,
    drawAreas,
    currentLocation,
    onActiveDetailChanged,
}: LayoutProps) {
    const hasPath = route.selectedPath.points.coordinates.length > 0
    const elevationWidget = hasPath ? (
        <ElevationInfoBar
            selectedPath={route.selectedPath}
            alternativePaths={route.routingResult.paths}
            profile={query.routingProfile.name}
            isExpanded={false}
            onToggleExpanded={() => {}}
            onActiveDetailChanged={onActiveDetailChanged}
        />
    ) : undefined
    return (
        <>
            <div className={styles.smallScreenSidebar}>
                <MobileSidebar
                    query={query}
                    route={route}
                    error={error}
                    encodedValues={encodedValues}
                    drawAreas={drawAreas}
                    map={map}
                />
            </div>
            <div className={styles.smallScreenMap}>
                <MapComponent map={map} />
            </div>
            <div className={styles.smallScreenMapOptions}>
                <div className={styles.onMapRightSide}>
                    <MapOptions {...mapOptions} />
                    <LocationButton currentLocation={currentLocation} />
                </div>
            </div>

            <div className={styles.smallScreenRoutingResult}>
                <RoutingResults
                    info={route.routingResult.info}
                    paths={route.routingResult.paths}
                    selectedPath={route.selectedPath}
                    currentRequest={query.currentRequest}
                    profile={query.routingProfile.name}
                    detailsExtra={elevationWidget}
                />
            </div>

            <div className={styles.smallScreenPoweredBy}>
                <PoweredBy />
            </div>
        </>
    )
}
