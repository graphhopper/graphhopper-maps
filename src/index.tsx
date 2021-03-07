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
import { AddPoint, RemovePoint } from '@/actions/Actions'

function setUpQueryStoreFromUrl() {
    try {
        const queryPointsFromUrl = parseUrl(window.location.href)
        const queryPointsFromStore = getQueryStore().state.queryPoints

        // add the point from the url to the store
        queryPointsFromUrl.forEach((point, i) => Dispatcher.dispatch(new AddPoint(i, point.coordinate, true)))

        // remove the points the store has as default but keepa at least as many points as the default number of points in case the url didn't have any or too few points
        // Removing them after adding the others prevents premature routing requests
        for (let i = 0; i < queryPointsFromStore.length && i < queryPointsFromUrl.length; i++) {
            const point = queryPointsFromStore[i]
            Dispatcher.dispatch(new RemovePoint(point))
        }
    } catch (e) {
        console.error(e)
    }
}

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
setUpQueryStoreFromUrl()

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
