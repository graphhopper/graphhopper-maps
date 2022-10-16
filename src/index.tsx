import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as config from 'config'
import MapActionReceiver from '@/stores/MapActionReceiver'
import { createMap, getMap, setMap } from '@/map/map'
import MapFeatureStore from '@/stores/MapFeatureStore'
import SettingsStore from '@/stores/SettingsStore'
import {SpeechSynthesizer} from "@/SpeechSynthesizer";
import {setTranslation} from "@/translation/Translation";
import {getApi, setApi} from "@/api/Api";
import QueryStore from "@/stores/QueryStore";
import RouteStore from "@/stores/RouteStore";
import ApiInfoStore from "@/stores/ApiInfoStore";
import ErrorStore from "@/stores/ErrorStore";
import {
    getApiInfoStore,
    getErrorStore, getLocationStore, getMapFeatureStore, getMapOptionsStore, getPathDetailsStore,
    getQueryStore,
    getRouteStore,
    getSettingsStore, getTurnNavigationStore,
    setStores
} from "@/stores/Stores";
import MapOptionsStore from "@/stores/MapOptionsStore";
import LocationStore from "@/stores/LocationStore";
import PathDetailsStore from "@/stores/PathDetailsStore";
import Dispatcher from "@/stores/Dispatcher";
import TurnNavigationStore from "@/stores/TurnNavigationStore";
import NavBar from "@/NavBar";
import App from "@/App";

let speechSynthesizer = new SpeechSynthesizer(navigator.language)
const url = new URL(window.location.href)
const locale = url.searchParams.get('locale')
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
    turnNavigationStore: new TurnNavigationStore(),
    locationStore: new LocationStore(speechSynthesizer),
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
Dispatcher.register(getLocationStore())
Dispatcher.register(getPathDetailsStore())
Dispatcher.register(getMapFeatureStore())

// register map action receiver
const smallScreenMediaQuery = window.matchMedia('(max-width: 44rem)')
const mapActionReceiver = new MapActionReceiver(getMap(), routeStore, () => smallScreenMediaQuery.matches)
Dispatcher.register(mapActionReceiver)

// Dispatcher.dispatch(new TurnNavigationUpdate({fakeGPS: fake !== null, soundEnabled: fake === null} as TurnNavigationState))

getApi().infoWithDispatch() // get infos about the api as soon as possible

// hook up the navbar to the query store and vice versa
const navBar = new NavBar(getQueryStore(), getMapOptionsStore())
// parse the initial url
navBar.parseUrlAndReplaceQuery()

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