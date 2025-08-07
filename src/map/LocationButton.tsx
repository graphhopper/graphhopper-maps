import styles from './LocationButton.module.css'
import Dispatcher from '@/stores/Dispatcher'
import { StartSyncCurrentLocation, StartWatchCurrentLocation } from '@/actions/Actions'
import LocationError from '@/map/location_error.svg'
import LocationSearching from '@/map/location_searching.svg'
import LocationOn from '@/map/location_on.svg'
import Location from '@/map/location.svg'
import LocationNotInSync from '@/map/location_not_in_sync.svg'
import { useEffect, useState } from 'react'
import { CurrentLocationStoreState } from '@/stores/CurrentLocationStore'

export default function LocationButton(props: { currentLocation: CurrentLocationStoreState }) {
    const [locationSearch, setLocationSearch] = useState('initial')

    useEffect(() => {
        if (props.currentLocation.enabled) {
            if (!props.currentLocation.syncView) setLocationSearch('on_but_not_in_sync')
            else if (props.currentLocation.error) setLocationSearch('error')
            else if (props.currentLocation.coordinate != null) setLocationSearch('on')
            else setLocationSearch('search')
        } else {
            setLocationSearch('initial')
        }
    }, [
        props.currentLocation.syncView,
        props.currentLocation.error,
        props.currentLocation.enabled,
        props.currentLocation.coordinate,
    ])

    return (
        <div
            className={styles.locationOnOff}
            onClick={() => {
                if (props.currentLocation.enabled && !props.currentLocation.error) {
                    Dispatcher.dispatch(new StartSyncCurrentLocation())
                } else {
                    Dispatcher.dispatch(new StartWatchCurrentLocation())
                    setLocationSearch('search')
                }
            }}
        >
            {locationSearch == 'initial' && <Location />}
            {locationSearch == 'error' && <LocationError />}
            {locationSearch == 'search' && <LocationSearching />}
            {locationSearch == 'on' && <LocationOn />}
            {locationSearch == 'on_but_not_in_sync' && <LocationNotInSync />}
        </div>
    )
}
