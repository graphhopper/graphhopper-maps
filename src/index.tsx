import React from 'react'
import ReactDOM from 'react-dom'

import App from '@/App'
import { getApiInfoStore, getQueryStore, getRouteStore, setStores } from '@/stores/Stores'
import Dispatcher from '@/stores/Dispatcher'
import RouteStore from '@/stores/RouteStore'
import ApiInfoStore from '@/stores/ApiInfoStore'
import { info } from '@/routing/Api'
import { createUrl, parseUrl } from '@/./QueryUrl'
import QueryStore from '@/stores/QueryStore'

// set up state management
const queryStore = new QueryStore()
setStores({
    queryStore: queryStore,
    routeStore: new RouteStore(queryStore),
    infoStore: new ApiInfoStore(),
})

// register stores at dispatcher to receive actions
Dispatcher.register(getQueryStore())
Dispatcher.register(getRouteStore())
Dispatcher.register(getApiInfoStore())

info().then(() => {}) // get infos about the api as soon as possible

// parse the window's url and set up a query from it
// this will also trigger a routing request if the url contains routing parameters
parseUrl(window.location.href, getQueryStore().state)

// hook up the app's state to the navbar to reflect state changes in the url
getQueryStore().register(() => {
    const url = createUrl(window.location.origin, getQueryStore().state)
    window.history.replaceState('last state', '', url.toString())
})

// create a div which holds the app and render the 'App' component
const root = document.createElement('div') as HTMLDivElement
root.id = 'root'
root.style.height = '100%'
document.body.appendChild(root)

ReactDOM.render(<App />, root)
