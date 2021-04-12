import React from 'react'
import ReactDOM from 'react-dom'

import App from '@/App'
import {
    getApiInfoStore,
    getErrorStore,
    getMapOptionsStore,
    getQueryStore,
    getCurrentLocationStore,
    getRouteStore,
    setStores,
} from '@/stores/Stores'
import Dispatcher from '@/stores/Dispatcher'
import RouteStore from '@/stores/RouteStore'
import ApiInfoStore from '@/stores/ApiInfoStore'
import { createUrl, parseUrl } from '@/./QueryUrl'
import QueryStore from '@/stores/QueryStore'
import { Coordinate } from '@/stores/QueryStore'
import { SetCurrentLocation } from '@/actions/Actions'
import CurrentLocationStore from '@/stores/CurrentLocationStore'
import { CurrentLocationState } from '@/stores/CurrentLocationStore'
import { ApiImpl } from '@/api/Api'
import ErrorStore from '@/stores/ErrorStore'
import MapOptionsStore from '@/stores/MapOptionsStore'

// set up state management
const api = new ApiImpl()
const queryStore = new QueryStore(api)
const currentLocationStore = new CurrentLocationStore()
setStores({
    queryStore: queryStore,
    currentLocationStore: currentLocationStore,
    routeStore: new RouteStore(queryStore),
    infoStore: new ApiInfoStore(),
    errorStore: new ErrorStore(),
    mapOptionsStore: new MapOptionsStore(),
})

// register stores at dispatcher to receive actions
Dispatcher.register(getQueryStore())
Dispatcher.register(getCurrentLocationStore())
Dispatcher.register(getRouteStore())
Dispatcher.register(getApiInfoStore())
Dispatcher.register(getErrorStore())
Dispatcher.register(getMapOptionsStore())

api.infoWithDispatch() // get infos about the api as soon as possible

// parse the window's url and set up a query from it
// this will also trigger a routing request if the url contains routing parameters
parseUrl(window.location.href, getQueryStore().state)

// hook up the app's state to the navbar to reflect state changes in the url
getQueryStore().register(() => {
    const url = createUrl(window.location.origin, getQueryStore().state)
    window.history.replaceState('last state', '', url.toString())
})

currentLocationStore.init();

// create a div which holds the app and render the 'App' component
const root = document.createElement('div') as HTMLDivElement
root.id = 'root'
root.style.height = '100%'
document.body.appendChild(root)

ReactDOM.render(<App />, root)
