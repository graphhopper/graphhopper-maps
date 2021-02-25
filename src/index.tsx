import React from 'react'
import ReactDOM from 'react-dom'

import App from '@/App'
import { getApiInfoStore, getQueryStore, getRouteStore, setStores } from '@/stores/Stores'
import Dispatcher from '@/stores/Dispatcher'
import RouteStore from '@/stores/RouteStore'
import ApiInfoStore from '@/stores/ApiInfoStore'
import { ghKey, info } from '@/routing/Api'
import { createUrl, parseUrl } from '@/./QueryUrl'
import QueryStore from '@/stores/QueryStore'
import { AddPoint, SetPoint } from '@/actions/Actions'

// set up state management
setStores({
    queryStore: new QueryStore(),
    routeStore: new RouteStore(),
    infoStore: new ApiInfoStore(),
})

// register stores at dispatcher to receive actions
Dispatcher.register(getQueryStore())
Dispatcher.register(getRouteStore())
Dispatcher.register(getApiInfoStore())

info(ghKey).then(() => {}) // get infos about the api as soon as possible

// parse the window's url and set up a query from it
// this will also trigger a routing request if the url contains routing parameters
try {
    const queryPoints = parseUrl(window.location.href)
    queryPoints.forEach((point, i) => {
        // this assumes that the store starts with a default of two points
        // it also relies on the point's ids to be the same as those in the store.
        // Slightly brittle I guess.
        if (i > 1) Dispatcher.dispatch(new AddPoint())
        Dispatcher.dispatch(new SetPoint(point.id, point.coordinate, ''))
    })
} catch (e) {
    console.error(e)
}

// hook up the app's state to the navbar to reflect state changes in the url
getQueryStore().register(() => {
    const url = createUrl(window.location.origin, getQueryStore().state.queryPoints)
    window.history.replaceState('last state', '', url.toString())
})

// create a div which holds the app and render the 'App' component
const root = document.createElement('div') as HTMLDivElement
root.id = 'root'
root.style.height = '100%'
document.body.appendChild(root)

ReactDOM.render(<App />, root)
