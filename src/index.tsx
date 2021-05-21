import React from 'react'
import ReactDOM from 'react-dom'

import App from '@/App'
import {
    getApiInfoStore,
    getErrorStore,
    getMapOptionsStore,
    getQueryStore,
    getRouteStore,
    setStores,
} from '@/stores/Stores'
import Dispatcher from '@/stores/Dispatcher'
import RouteStore from '@/stores/RouteStore'
import ApiInfoStore from '@/stores/ApiInfoStore'
import { createUrl, parseUrl } from '@/./QueryUrl'
import QueryStore from '@/stores/QueryStore'
import { ApiImpl } from '@/api/Api'
import ErrorStore from '@/stores/ErrorStore'
import MapOptionsStore from '@/stores/MapOptionsStore'
import { setTranslation } from '@/translation/Translation'

const locale = navigator.language
setTranslation(locale)

// set up state management
const api = new ApiImpl()
const queryStore = new QueryStore(api)
setStores({
    queryStore: queryStore,
    routeStore: new RouteStore(queryStore),
    infoStore: new ApiInfoStore(),
    errorStore: new ErrorStore(),
    mapOptionsStore: new MapOptionsStore(),
})

// register stores at dispatcher to receive actions
Dispatcher.register(getQueryStore())
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
    const url = createUrl(window.location.origin + window.location.pathname, getQueryStore().state)
    window.history.replaceState('last state', '', url.toString())
})

// create a div which holds the app and render the 'App' component
const root = document.createElement('div') as HTMLDivElement
root.id = 'root'
root.style.height = '100%'
document.body.appendChild(root)

ReactDOM.render(<App />, root)
