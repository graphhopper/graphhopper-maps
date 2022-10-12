import QueryStore from '@/stores/QueryStore'
import RouteStore from '@/stores/RouteStore'
import ApiInfoStore from '@/stores/ApiInfoStore'
import ErrorStore from '@/stores/ErrorStore'
import MapOptionsStore from '@/stores/MapOptionsStore'
import PathDetailsStore from '@/stores/PathDetailsStore'
import MapFeatureStore from '@/stores/MapFeatureStore'
import SettingsStore from '@/stores/SettingsStore'

let settingsStore: SettingsStore
let queryStore: QueryStore
let routeStore: RouteStore
let infoStore: ApiInfoStore
let errorStore: ErrorStore
let mapOptionsStore: MapOptionsStore
let pathDetailsStore: PathDetailsStore
let mapFeatureStore: MapFeatureStore

interface StoresInput {
    settingsStore: SettingsStore
    queryStore: QueryStore
    routeStore: RouteStore
    infoStore: ApiInfoStore
    errorStore: ErrorStore
    mapOptionsStore: MapOptionsStore
    pathDetailsStore: PathDetailsStore
    mapFeatureStore: MapFeatureStore
}

export const setStores = function (stores: StoresInput) {
    settingsStore = stores.settingsStore
    queryStore = stores.queryStore
    routeStore = stores.routeStore
    infoStore = stores.infoStore
    errorStore = stores.errorStore
    mapOptionsStore = stores.mapOptionsStore
    pathDetailsStore = stores.pathDetailsStore
    mapFeatureStore = stores.mapFeatureStore
}

export const getSettingsStore = () => settingsStore
export const getQueryStore = () => queryStore
export const getRouteStore = () => routeStore
export const getApiInfoStore = () => infoStore
export const getErrorStore = () => errorStore
export const getMapOptionsStore = () => mapOptionsStore
export const getPathDetailsStore = () => pathDetailsStore
export const getMapFeatureStore = () => mapFeatureStore
