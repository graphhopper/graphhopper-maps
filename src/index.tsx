import React from 'react'
import ReactDOM from 'react-dom'

import App from '@/App'
import {
    getApiInfoStore,
    getErrorStore,
    getMapOptionsStore,
    getPathDetailsStore,
    getQueryStore,
    getRouteStore,
    setStores,
} from '@/stores/Stores'
import Dispatcher from '@/stores/Dispatcher'
import RouteStore from '@/stores/RouteStore'
import ApiInfoStore from '@/stores/ApiInfoStore'
import QueryStore from '@/stores/QueryStore'
import { ApiImpl } from '@/api/Api'
import ErrorStore from '@/stores/ErrorStore'
import MapOptionsStore from '@/stores/MapOptionsStore'
import PathDetailsStore from '@/stores/PathDetailsStore'
import NavBar from '@/NavBar'

// set up state management
const api = new ApiImpl()
const queryStore = new QueryStore(api)
setStores({
    queryStore: queryStore,
    routeStore: new RouteStore(queryStore),
    infoStore: new ApiInfoStore(),
    errorStore: new ErrorStore(),
    mapOptionsStore: new MapOptionsStore(),
    pathDetailsStore: new PathDetailsStore(),
})

// register stores at dispatcher to receive actions
Dispatcher.register(getQueryStore())
Dispatcher.register(getRouteStore())
Dispatcher.register(getApiInfoStore())
Dispatcher.register(getErrorStore())
Dispatcher.register(getMapOptionsStore())
Dispatcher.register(getPathDetailsStore())

api.infoWithDispatch() // get infos about the api as soon as possible

// hook up the navbar to the query store and vice versa
const navBar = new NavBar(getQueryStore(), window)
// parse the initial url
navBar.parseUrl()

// create a div which holds the app and render the 'App' component
const root = document.createElement('div') as HTMLDivElement
root.id = 'root'
root.style.height = '100%'
document.body.appendChild(root)

ReactDOM.render(<App />, root)
