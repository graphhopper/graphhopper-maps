import React from 'react'
import ReactDOM from 'react-dom'

import App from '@/App'
import {getQueryStore, getRouteStore, setStores} from "@/stores/Stores";
import QueryStore from "@/stores/QueryStore";
import Dispatcher from "@/stores/Dispatcher";
import RouteStore from "@/stores/RouteStore";

// set up state management
setStores({
    queryStore: new QueryStore(),
    routeStore: new RouteStore()
})

// register stores at dispatcher to receive actions
Dispatcher.register(getQueryStore())
Dispatcher.register(getRouteStore())

const root = document.createElement('div') as HTMLDivElement
root.id = 'root'
root.style.height = '100%'
document.body.appendChild(root)

ReactDOM.render(<App/>, root)
