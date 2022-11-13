import React from 'react'
import { createRoot } from 'react-dom/client'
import * as config from 'config'
import MapActionReceiver from '@/stores/MapActionReceiver'
import { createMap, getMap, setMap } from '@/map/map'
import MapFeatureStore from '@/stores/MapFeatureStore'
import SettingsStore from '@/stores/SettingsStore'
import { SpeechSynthesizerImpl } from '@/SpeechSynthesizer'
import { setTranslation } from '@/translation/Translation'
import { getApi, setApi } from '@/api/Api'
import QueryStore from '@/stores/QueryStore'
import RouteStore from '@/stores/RouteStore'
import ApiInfoStore from '@/stores/ApiInfoStore'
import ErrorStore from '@/stores/ErrorStore'
import {
    getApiInfoStore,
    getErrorStore,
    getTurnNavigationStore,
    getMapFeatureStore,
    getMapOptionsStore,
    getPathDetailsStore,
    getQueryStore,
    getRouteStore,
    getSettingsStore,
    setStores,
} from '@/stores/Stores'
import MapOptionsStore from '@/stores/MapOptionsStore'
import TurnNavigationStore from '@/stores/TurnNavigationStore'
import PathDetailsStore from '@/stores/PathDetailsStore'
import Dispatcher from '@/stores/Dispatcher'
import NavBar from '@/NavBar'
import App from '@/App'
import { ErrorAction, InfoReceived } from '@/actions/Actions'

const speechSynthesizer = new SpeechSynthesizerImpl(navigator.language)
console.log(`Source code: https://github.com/graphhopper/graphhopper-maps/tree/${GIT_SHA}`)

const url = new URL(window.location.href)
const locale = url.searchParams.get('locale')
const fake = url.searchParams.get('fake')
setTranslation(locale || navigator.language)

// use graphhopper api key from url or try using one from the config
const apiKey = url.searchParams.has('key') ? url.searchParams.get('key') : config.keys.graphhopper
setApi(config.api, apiKey || '')

const initialCustomModelStr = url.searchParams.get('custom_model')
const queryStore = new QueryStore(getApi(), initialCustomModelStr)
const routeStore = new RouteStore(queryStore)

setStores({
    settingsStore: new SettingsStore(),
    queryStore: queryStore,
    routeStore: routeStore,
    infoStore: new ApiInfoStore(),
    errorStore: new ErrorStore(),
    mapOptionsStore: new MapOptionsStore(),
    turnNavigationStore: new TurnNavigationStore(getApi(), speechSynthesizer, fake != null),
    pathDetailsStore: new PathDetailsStore(),
    mapFeatureStore: new MapFeatureStore(),
})

setMap(createMap())

// register stores at dispatcher to receive actions
Dispatcher.register(getSettingsStore())
Dispatcher.register(getQueryStore())
Dispatcher.register(getRouteStore())
Dispatcher.register(getApiInfoStore())
Dispatcher.register(getErrorStore())
Dispatcher.register(getMapOptionsStore())
Dispatcher.register(getTurnNavigationStore())
Dispatcher.register(getPathDetailsStore())
Dispatcher.register(getMapFeatureStore())

// register map action receiver
const smallScreenMediaQuery = window.matchMedia('(max-width: 44rem)')
const mapActionReceiver = new MapActionReceiver(getMap(), routeStore, () => smallScreenMediaQuery.matches)
Dispatcher.register(mapActionReceiver)

const navBar = new NavBar(getQueryStore(), getMapOptionsStore())

// get infos about the api as soon as possible
getApi()
    .info()
    .then(info => {
        Dispatcher.dispatch(new InfoReceived(info))
        navBar.updateStateFromUrl().then(() => navBar.startSyncingUrlWithAppState())
    })
    .catch(e => Dispatcher.dispatch(new ErrorAction(e.message)))

// create a div which holds the app and render the 'App' component
const rootDiv = document.createElement('div') as HTMLDivElement
rootDiv.id = 'root'
rootDiv.style.height = '100%'
document.body.appendChild(rootDiv)

const root = createRoot(rootDiv)
root.render(
    // <StrictMode>
    <App />
    // </StrictMode>
)
