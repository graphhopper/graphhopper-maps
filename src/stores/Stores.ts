import QueryStore from '@/stores/QueryStore'
import RouteStore from '@/stores/RouteStore'
import ApiInfoStore from '@/stores/ApiInfoStore'

let queryStore: QueryStore
let routeStore: RouteStore
let infoStore: ApiInfoStore

interface StoresInput {
    queryStore: QueryStore
    routeStore: RouteStore
    infoStore: ApiInfoStore
}

export const setStores = function (stores: StoresInput) {
    queryStore = stores.queryStore
    routeStore = stores.routeStore
    infoStore = stores.infoStore
}

export const getQueryStore = () => queryStore
export const getRouteStore = () => routeStore
export const getApiInfoStore = () => infoStore
