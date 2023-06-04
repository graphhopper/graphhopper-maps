import styles from './LocationButton.module.css'
import {onCurrentLocationButtonClicked} from "@/map/MapComponent";
import Dispatcher from "@/stores/Dispatcher";
import {SetBBox} from "@/actions/Actions";
import {getBBoxFromCoord} from "@/stores/QueryStore";
import LocationError from "@/map/location_error.svg";
import LocationSearching from "@/map/location_searching.svg";
import LocationOn from "@/map/location_on.svg";
import {useState} from "react";

export default function LocationButton() {
    const [locationSearch, setLocationSearch] = useState('synched_map_or_initial')
    return <div className={styles.locationOnOff}
                onClick={() => {
                    setLocationSearch('search')
                    onCurrentLocationButtonClicked(coord => {
                        if (coord) {
                            Dispatcher.dispatch(new SetBBox(getBBoxFromCoord(coord)))
                            // We do not reset state of this button when map is moved, so we do not know if
                            // the map is currently showing the location.
                            setLocationSearch('synched_map_or_initial')
                        } else setLocationSearch('error')
                    })
                }}>
        {locationSearch == 'error' && <LocationError/>}
        {locationSearch == 'search' && <LocationSearching/>}
        {locationSearch == 'synched_map_or_initial' && <LocationOn/>}
    </div>
}