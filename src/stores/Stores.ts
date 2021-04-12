import QueryStore from '@/stores/QueryStore'
import CurrentLocationStore from '@/stores/CurrentLocationStore'
import RouteStore from '@/stores/RouteStore'
import ApiInfoStore from '@/stores/ApiInfoStore'
import ErrorStore from '@/stores/ErrorStore'
import MapOptionsStore from '@/stores/MapOptionsStore'

let queryStore: QueryStore
let currentLocationStore: CurrentLocationStore
let routeStore: RouteStore
let infoStore: ApiInfoStore
let errorStore: ErrorStore
let mapOptionsStore: MapOptionsStore

interface StoresInput {
    queryStore: QueryStore
    currentLocationStore: CurrentLocationStore
    routeStore: RouteStore
    infoStore: ApiInfoStore
    errorStore: ErrorStore
    mapOptionsStore: MapOptionsStore
}

export const setStores = function (stores: StoresInput) {
    queryStore = stores.queryStore
    currentLocationStore = stores.currentLocationStore
    routeStore = stores.routeStore
    infoStore = stores.infoStore
    errorStore = stores.errorStore
    mapOptionsStore = stores.mapOptionsStore
}

export const getQueryStore = () => queryStore
export const getCurrentLocationStore = () => currentLocationStore
export const getRouteStore = () => routeStore
export const getApiInfoStore = () => infoStore
export const getErrorStore = () => errorStore
export const getMapOptionsStore = () => mapOptionsStore
