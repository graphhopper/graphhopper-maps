import styles from './LocationButton.module.css'
import Dispatcher from '@/stores/Dispatcher'
import { StartSyncCurrentLocation, StartWatchCurrentLocation, StopWatchCurrentLocation } from '@/actions/Actions'
import LocationError from '@/map/location_error.svg'
import LocationSearching from '@/map/location_searching.svg'
import LocationOn from '@/map/location_on.svg'
import Location from '@/map/location.svg'
import LocationNotInSync from '@/map/location_not_in_sync.svg'
import { CurrentLocationStoreState } from '@/stores/CurrentLocationStore'

export default function LocationButton(props: { currentLocation: CurrentLocationStoreState }) {
    return (
        <div
            className={styles.locationOnOff}
            onClick={() => {
                if (props.currentLocation.enabled && !props.currentLocation.syncView && !props.currentLocation.error) {
                    Dispatcher.dispatch(new StartSyncCurrentLocation())
                } else {
                    if (props.currentLocation.enabled) {
                        Dispatcher.dispatch(new StopWatchCurrentLocation())
                    } else {
                        Dispatcher.dispatch(new StartWatchCurrentLocation())
                    }
                }
            }}
        >
            {(() => {
                if (props.currentLocation.error) return <LocationError />
                if (!props.currentLocation.enabled) return <Location />
                if (!props.currentLocation.syncView) return <LocationNotInSync />
                if (props.currentLocation.coordinate != null) return <LocationOn />
                return <LocationSearching />
            })()}
        </div>
    )
}
