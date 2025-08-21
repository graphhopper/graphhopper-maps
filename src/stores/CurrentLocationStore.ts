import Store from '@/stores/Store'
import Dispatcher, { Action } from '@/stores/Dispatcher'
import {
    CurrentLocation,
    CurrentLocationError,
    StartSyncCurrentLocation,
    StartWatchCurrentLocation,
    StopSyncCurrentLocation,
    StopWatchCurrentLocation,
} from '@/actions/Actions'
import { tr } from '@/translation/Translation'
import { Coordinate } from '@/utils'

export interface CurrentLocationStoreState {
    error: string | null
    enabled: boolean
    syncView: boolean
    accuracy: number // meters
    heading: number | null
    coordinate: Coordinate | null
}

export default class CurrentLocationStore extends Store<CurrentLocationStoreState> {
    private watchId: number | null = null

    constructor() {
        super({
            error: null,
            enabled: false,
            syncView: false,
            accuracy: 0,
            heading: null,
            coordinate: null,
        })
    }

    reduce(state: CurrentLocationStoreState, action: Action): CurrentLocationStoreState {
        // console.log('NOW ', action.constructor.name, action)
        // console.log('NOW state ', state)

        if (action instanceof StartWatchCurrentLocation) {
            if (state.enabled) {
                console.log('NOW cannot start as already started. ID = ' + this.watchId)
                return state
            }

            this.start()
            return {
                ...state,
                error: null,
                enabled: true,
                syncView: true,
                heading: null,
                coordinate: null,
            }
        } else if (action instanceof StopWatchCurrentLocation) {
            this.stop()
            return {
                ...state,
                error: null,
                enabled: false,
                heading: null,
                syncView: false,
            }
        } else if (action instanceof CurrentLocationError) {
            return {
                ...state,
                enabled: false,
                syncView: false,
                error: action.error,
                heading: null,
                coordinate: null,
            }
        } else if (action instanceof CurrentLocation) {
            return {
                ...state,
                heading: action.heading,
                accuracy: action.accuracy,
                coordinate: action.coordinate,
            }
        } else if (action instanceof StartSyncCurrentLocation) {
            if (!state.enabled) {
                console.warn('cannot start synchronizing view as current location not enabled')
                return state
            }

            return {
                ...state,
                error: null,
                enabled: true,
                syncView: true,
            }
        } else if (action instanceof StopSyncCurrentLocation) {
            if (!state.enabled) return state

            return {
                ...state,
                error: null,
                syncView: false,
            }
        }
        return state
    }

    start() {
        if (!navigator.geolocation) {
            Dispatcher.dispatch(new CurrentLocationError('Geolocation is not supported in this browser'))
            this.watchId = null
            return
        }

        this.watchId = navigator.geolocation.watchPosition(
            position => {
                Dispatcher.dispatch(
                    new CurrentLocation(
                        { lng: position.coords.longitude, lat: position.coords.latitude },
                        position.coords.accuracy,
                        // heading is in degrees from north, clockwise
                        position.coords.heading,
                    ),
                )
            },
            error => {
                Dispatcher.dispatch(new CurrentLocationError(tr('searching_location_failed') + ': ' + error.message))
            },
            // DO NOT use e.g. maximumAge: 5_000 -> getCurrentPosition will then never return on mobile firefox!?
            { timeout: 300_000, enableHighAccuracy: true },
        )
    }

    stop() {
        if (this.watchId) navigator.geolocation.clearWatch(this.watchId)
    }
}
