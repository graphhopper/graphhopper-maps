import { useEffect, useState } from 'react'
import PathDetails from '@/pathDetails/PathDetails'
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
} from '@/stores/Stores'
import MapComponent from '@/map/MapComponent'
import MapOptions from '@/map/MapOptions'
import MobileSidebar from '@/sidebar/MobileSidebar'
import { useMediaQuery } from 'react-responsive'
import RoutingResults from '@/sidebar/RoutingResults'
import PoweredBy from '@/sidebar/PoweredBy'
import { QueryStoreState, RequestState } from '@/stores/QueryStore'
import { RouteStoreState } from '@/stores/RouteStore'
import { MapOptionsStoreState } from '@/stores/MapOptionsStore'
import { ErrorStoreState } from '@/stores/ErrorStore'
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
import SearchSvg from '@/sidebar/search.svg'
import Dispatcher from '@/stores/Dispatcher'
import { SearchPOI } from '@/actions/Actions'
import usePOIsLayer from '@/layers/UsePOIsLayer'
import { toLonLat, transformExtent} from "ol/proj";
import {calcDist} from "@/distUtils";

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

        getSettingsStore().register(onSettingsChanged)
        getQueryStore().register(onQueryChanged)
        getApiInfoStore().register(onInfoChanged)
        getRouteStore().register(onRouteChanged)
        getErrorStore().register(onErrorChanged)
        getMapOptionsStore().register(onMapOptionsChanged)
        getPathDetailsStore().register(onPathDetailsChanged)
        getMapFeatureStore().register(onMapFeaturesChanged)
        getPOIsStore().register(onPOIsChanged)

        onQueryChanged()
        onInfoChanged()
        onRouteChanged()
        onErrorChanged()
        onMapOptionsChanged()
        onPathDetailsChanged()
        onMapFeaturesChanged()
        onPOIsChanged()

        return () => {
            getSettingsStore().register(onSettingsChanged)
            getQueryStore().deregister(onQueryChanged)
            getApiInfoStore().deregister(onInfoChanged)
            getRouteStore().deregister(onRouteChanged)
            getErrorStore().deregister(onErrorChanged)
            getMapOptionsStore().deregister(onMapOptionsChanged)
            getPathDetailsStore().deregister(onPathDetailsChanged)
            getMapFeatureStore().deregister(onMapFeaturesChanged)
            getPOIsStore().deregister(onPOIsChanged)
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
    usePathDetailsLayer(map, pathDetails)
    usePOIsLayer(map, pois)

    const isSmallScreen = useMediaQuery({ query: '(max-width: 44rem)' })
    return (
        <SettingsContext.Provider value={settings}>
            <div className={styles.appWrapper}>
                <MapPopups map={map} pathDetails={pathDetails} mapFeatures={mapFeatures} />
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
    error: ErrorStoreState
    encodedValues: object[]
    drawAreas: boolean
}

function LargeScreenLayout({ query, route, map, error, mapOptions, encodedValues, drawAreas }: LayoutProps) {
    const [showSidebar, setShowSidebar] = useState(true)
    const [showCustomModelBox, setShowCustomModelBox] = useState(false)
    const [showSearchAreaList, setShowSearchAreaList] = useState(false)

    return (
        <>
            {showSidebar ? (
                <div className={styles.sidebar}>
                    <div className={styles.sidebarContent} id={SIDEBAR_CONTENT_ID}>
                        <PlainButton onClick={() => setShowSidebar(false)} className={styles.sidebarCloseButton}>
                            <Cross/>
                        </PlainButton>
                        <RoutingProfiles
                            routingProfiles={query.profiles}
                            selectedProfile={query.routingProfile}
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
                        <Search points={query.queryPoints}/>
                        <div>{!error.isDismissed && <ErrorMessage error={error}/>}</div>
                        <RoutingResults
                            info={route.routingResult.info}
                            paths={route.routingResult.paths}
                            selectedPath={route.selectedPath}
                            currentRequest={query.currentRequest}
                            profile={query.routingProfile.name}
                        />
                        <div>
                            <PoweredBy/>
                        </div>
                    </div>
                    <div className={styles.searchArea}>
                        {!showSearchAreaList && (
                            <div className={styles.searchAreaText} onClick={e => setShowSearchAreaList(true)}>
                                <SearchSvg/>
                                <div>Search this area</div>
                            </div>
                        )}
                        {showSearchAreaList && (
                            <div className={styles.searchAreaListWrapper}>
                                <PlainButton
                                    onClick={e => {
                                        setShowSearchAreaList(false)
                                    }}
                                    className={styles.searchAreaListClose}
                                >
                                    <Cross/>
                                </PlainButton>
                                <div className={styles.searchAreaList}>
                                    {[
                                        {i: 'restaurant', q: 'amenity:restaurant', n: 'restaurant'},
                                        {i: 'train', q: 'highway:bus_stop', n: 'haltestelle'},
                                        {i: 'store', q: 'shop:supermarket', n: 'super market'},
                                        {i: 'hotel', q: 'building:hotel', n: 'hotel'},
                                        {i: 'luggage', q: 'tourism', n: 'tourism'},
                                        {i: 'museum', q: 'building:museum', n: 'museum'},
                                        {i: 'local_pharmacy', q: 'amenity:pharmacy', n: 'pharmacy'},
                                        {i: 'local_hospital', q: 'amenity:hospital', n: 'hospital'},
                                        {i: 'universal_currency_alt', q: 'amenity:bank', n: 'bank'},
                                        {
                                            i: 'school',
                                            q: 'amenity:school building:school building:university',
                                            n: 'education'
                                        },
                                        {i: 'sports_handball', q: 'leisure', n: 'leisure'},
                                        {i: 'flight_takeoff', q: 'aeroway:aerodrome', n: 'airport'},
                                        {i: 'local_parking', q: 'amenity:parking', n: 'parking'},
                                    ].map(o => (
                                        <div
                                            key={o.i}
                                            onClick={e => {
                                                const center = map.getView().getCenter()
                                                    ? toLonLat(map.getView().getCenter()!)
                                                    : [13.4, 52.5]
                                                const origExtent = map.getView().calculateExtent(map.getSize())
                                                var extent = transformExtent(origExtent, 'EPSG:3857', 'EPSG:4326');
                                                const radius = calcDist({
                                                    lng: extent[0],
                                                    lat: extent[1]
                                                }, {lng: extent[2], lat: extent[3]}) / 2 / 1000
                                                const coordinate = {lng: center[0], lat: center[1]}
                                                Dispatcher.dispatch(new SearchPOI(o.i, o.q, coordinate, radius))
                                            }}
                                        >
                                            {o.n}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className={styles.sidebarWhenClosed} onClick={() => setShowSidebar(true)}>
                    <PlainButton className={styles.sidebarOpenButton}>
                        <Menu/>
                    </PlainButton>
                </div>
            )}
            <div className={styles.popupContainer} id={POPUP_CONTAINER_ID}/>
            <div className={styles.onMapRightSide}>
                <MapOptions {...mapOptions} />
                <LocationButton queryPoints={query.queryPoints}/>
            </div>
            <div className={styles.map}>
                <MapComponent map={map}/>
            </div>

            <div className={styles.pathDetails}>
                <PathDetails selectedPath={route.selectedPath}/>
            </div>
        </>
    )
}

function SmallScreenLayout({query, route, map, error, mapOptions, encodedValues, drawAreas}: LayoutProps) {
    return (
        <>
            <div className={styles.smallScreenSidebar}>
                <MobileSidebar
                    query={query}
                    route={route}
                    error={error}
                    encodedValues={encodedValues}
                    drawAreas={drawAreas}
                />
            </div>
            <div className={styles.smallScreenMap}>
                <MapComponent map={map}/>
            </div>
            <div className={styles.smallScreenMapOptions}>
                <div className={styles.onMapRightSide}>
                    <MapOptions {...mapOptions} />
                    <LocationButton queryPoints={query.queryPoints}/>
                </div>
            </div>

            <div className={styles.smallScreenRoutingResult}>
                <RoutingResults
                    info={route.routingResult.info}
                    paths={route.routingResult.paths}
                    selectedPath={route.selectedPath}
                    currentRequest={query.currentRequest}
                    profile={query.routingProfile.name}
                />
            </div>

            <div className={styles.smallScreenPoweredBy}>
                <PoweredBy/>
            </div>
        </>
    )
}
