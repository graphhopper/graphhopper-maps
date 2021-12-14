import QueryStore from '@/stores/QueryStore'
import RouteStore from '@/stores/RouteStore'
import ApiInfoStore from '@/stores/ApiInfoStore'
import ErrorStore from '@/stores/ErrorStore'
import MapOptionsStore from '@/stores/MapOptionsStore'
import LocationStore from '@/stores/LocationStore'
import PathDetailsStore from '@/stores/PathDetailsStore'
import ViewportStore from '@/stores/ViewportStore'
import TurnNavigationStore from "@/stores/TurnNavigationStore";

let queryStore: QueryStore
let routeStore: RouteStore
let infoStore: ApiInfoStore
let errorStore: ErrorStore
let mapOptionsStore: MapOptionsStore
let turnNavigationStore: TurnNavigationStore
let locationStore: LocationStore
let pathDetailsStore: PathDetailsStore
let viewportStore: ViewportStore

interface StoresInput {
    queryStore: QueryStore
    routeStore: RouteStore
    infoStore: ApiInfoStore
    errorStore: ErrorStore
    mapOptionsStore: MapOptionsStore
    turnNavigationStore: TurnNavigationStore
    locationStore: LocationStore
    pathDetailsStore: PathDetailsStore
    viewportStore: ViewportStore
}

export const setStores = function (stores: StoresInput) {
    queryStore = stores.queryStore
    routeStore = stores.routeStore
    infoStore = stores.infoStore
    errorStore = stores.errorStore
    mapOptionsStore = stores.mapOptionsStore
    turnNavigationStore = stores.turnNavigationStore
    locationStore = stores.locationStore
    pathDetailsStore = stores.pathDetailsStore
    viewportStore = stores.viewportStore
}

export const getQueryStore = () => queryStore
export const getRouteStore = () => routeStore
export const getApiInfoStore = () => infoStore
export const getErrorStore = () => errorStore
export const getMapOptionsStore = () => mapOptionsStore
export const getTurnNavigationStore = () => turnNavigationStore
export const getLocationStore = () => locationStore
export const getPathDetailsStore = () => pathDetailsStore
export const getViewportStore = () => viewportStore
