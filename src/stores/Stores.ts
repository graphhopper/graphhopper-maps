import QueryStore from "@/stores/QueryStore";
import RouteStore from "@/stores/RouteStore";

let queryStore: QueryStore
let routeStore : RouteStore

interface StoresInput {
    queryStore: QueryStore,
    routeStore: RouteStore
}

export const setStores = function (stores: StoresInput) {
    queryStore = stores.queryStore
    routeStore = stores.routeStore
}

export const getQueryStore = () => queryStore
export const getRouteStore = () => routeStore