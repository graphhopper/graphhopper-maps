import React from 'react'
import ReactDOM from 'react-dom'

import { setTranslation } from '@/translation/Translation'
import App from '@/App'
import {
    getApiInfoStore,
    getErrorStore,
    getMapOptionsStore,
    getPathDetailsStore,
    getQueryStore,
    getRouteStore,
    getViewportStore,
    setStores,
} from '@/stores/Stores'
import Dispatcher from '@/stores/Dispatcher'
import RouteStore from '@/stores/RouteStore'
import ApiInfoStore from '@/stores/ApiInfoStore'
import QueryStore from '@/stores/QueryStore'
import ErrorStore from '@/stores/ErrorStore'
import MapOptionsStore from '@/stores/MapOptionsStore'
import PathDetailsStore from '@/stores/PathDetailsStore'
import ViewportStore from '@/stores/ViewportStore'
import NavBar from '@/NavBar'
import * as config from 'config'
import { getApi, setApi } from '@/api/Api'

let locale = new URL(window.location.href).searchParams.get('locale')
setTranslation(locale || navigator.language)

// set up state management
setApi(config.api, getApiKey())
const queryStore = new QueryStore(getApi())
const routeStore = new RouteStore(queryStore)

const smallScreenMediaQuery = window.matchMedia('(max-width: 44rem)')

setStores({
    queryStore: queryStore,
    routeStore: routeStore,
    infoStore: new ApiInfoStore(),
    errorStore: new ErrorStore(),
    mapOptionsStore: new MapOptionsStore(),
    pathDetailsStore: new PathDetailsStore(),
    viewportStore: new ViewportStore(routeStore, () => smallScreenMediaQuery.matches),
})

// register stores at dispatcher to receive actions
Dispatcher.register(getQueryStore())
Dispatcher.register(getRouteStore())
Dispatcher.register(getApiInfoStore())
Dispatcher.register(getErrorStore())
Dispatcher.register(getMapOptionsStore())
Dispatcher.register(getPathDetailsStore())
Dispatcher.register(getViewportStore())

getApi().infoWithDispatch() // get infos about the api as soon as possible

// hook up the navbar to the query store and vice versa
const navBar = new NavBar(getQueryStore(), getMapOptionsStore())
// parse the initial url
navBar.parseUrlAndReplaceQuery()

// create a div which holds the app and render the 'App' component
const root = document.createElement('div') as HTMLDivElement
root.id = 'root'
root.style.height = '100%'
document.body.appendChild(root)

ReactDOM.render(<App />, root)

function getApiKey() {
    const url = new URL(window.location.href)
    // use graphhopper api key from url or try using one from the config
    return url.searchParams.has('key') ? url.searchParams.get('key') : config.keys.graphhopper
}
