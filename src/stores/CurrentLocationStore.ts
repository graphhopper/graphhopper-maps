import Store from '@/stores/Store'
import Dispatcher, { Action } from '@/stores/Dispatcher'
import {
    CurrentLocation,
    CurrentLocationError,
    MoveMapToPoint,
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
    coordinate: Coordinate | null
}

export default class CurrentLocationStore extends Store<CurrentLocationStoreState> {
    private watchId: number | null = null

    constructor() {
        super({
            error: null,
            enabled: false,
            syncView: false,
            coordinate: null,
        })
    }

    reduce(state: CurrentLocationStoreState, action: Action): CurrentLocationStoreState {
        if (action instanceof StartWatchCurrentLocation) {
            if (state.enabled) {
                console.log('NOW cannot start as already started. ID = ' + this.watchId)
                return state
            }

            console.log('NOW start ' + JSON.stringify(action, null, 2))
            this.start()
            return {
                ...state,
                error: null,
                enabled: true,
                syncView: true,
                coordinate: null,
            }
        } else if (action instanceof StopWatchCurrentLocation) {
            console.log('NOW stop ' + JSON.stringify(action, null, 2))
            this.stop()
            return {
                ...state,
                error: null,
                enabled: false,
                syncView: false,
            }
        } else if (action instanceof CurrentLocationError) {
            console.log('NOW error ' + JSON.stringify(action, null, 2))
            return {
                ...state,
                enabled: false,
                error: action.error,
                coordinate: null,
            }
        } else if (action instanceof CurrentLocation) {
            console.log('NOW current ' + JSON.stringify(action, null, 2))
            return {
                ...state,
                coordinate: action.coordinate,
            }
        } else if (action instanceof StartSyncCurrentLocation) {
            if (!state.enabled) {
                console.log('NOW cannot start sync as not enabled')
                return state
            }

            console.log('NOW start sync ' + JSON.stringify(action, null, 2))
            return {
                ...state,
                error: null,
                enabled: true,
                syncView: true,
            }
        } else if (action instanceof StopSyncCurrentLocation) {
            if (!state.enabled) return state

            console.log('NOW stop sync ' + JSON.stringify(action, null, 2))
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
                    new CurrentLocation({ lng: position.coords.longitude, lat: position.coords.latitude })
                )
            },
            error => {
                Dispatcher.dispatch(new CurrentLocationError(tr('searching_location_failed') + ': ' + error.message))
            },
            // DO NOT use e.g. maximumAge: 5_000 -> getCurrentPosition will then never return on mobile firefox!?
            { timeout: 300_000, enableHighAccuracy: true }
        )
    }

    stop() {
        if (this.watchId) navigator.geolocation.clearWatch(this.watchId)
    }
}
