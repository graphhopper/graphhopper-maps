import styles from './LocationButton.module.css'
import { onCurrentLocationButtonClicked } from '@/map/MapComponent'
import Dispatcher from '@/stores/Dispatcher'
import { SetBBox, SetPoint } from '@/actions/Actions'
import { getBBoxFromCoord, QueryPoint, QueryPointType } from '@/stores/QueryStore'
import LocationError from '@/map/location_error.svg'
import LocationSearching from '@/map/location_searching.svg'
import LocationOn from '@/map/location_on.svg'
import { useState } from 'react'
import { tr } from '@/translation/Translation'

export default function LocationButton(props: { queryPoints: QueryPoint[] }) {
    const [locationSearch, setLocationSearch] = useState('synched_map_or_initial')
    return (
        <div
            className={styles.locationOnOff}
            onClick={() => {
                setLocationSearch('search')
                onCurrentLocationButtonClicked(coordinate => {
                    if (coordinate) {
                        if (props.queryPoints[0] && !props.queryPoints[0].isInitialized)
                            Dispatcher.dispatch(
                                new SetPoint(
                                    {
                                        ...props.queryPoints[0],
                                        coordinate,
                                        queryText: tr('current_location'),
                                        isInitialized: true,
                                        type: QueryPointType.From,
                                    },
                                    false
                                )
                            )
                        Dispatcher.dispatch(new SetBBox(getBBoxFromCoord(coordinate)))
                        // We do not reset state of this button when map is moved, so we do not know if
                        // the map is currently showing the location.
                        setLocationSearch('synched_map_or_initial')
                    } else setLocationSearch('error')
                })
            }}
        >
            {locationSearch == 'error' && <LocationError />}
            {locationSearch == 'search' && <LocationSearching />}
            {locationSearch == 'synched_map_or_initial' && <LocationOn />}
        </div>
    )
}
