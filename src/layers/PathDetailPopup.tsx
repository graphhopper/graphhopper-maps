import { useContext } from 'react'
import styles from '@/layers/DefaultMapPopup.module.css'
import { PathDetailsStoreState } from '@/stores/PathDetailsStore'
import { metersToText } from '@/Converters'
import { ShowDistanceInMilesContext } from '@/ShowDistanceInMilesContext'
import MapPopup from '@/layers/MapPopup'
import { Map } from 'ol'

interface PathDetailPopupProps {
    map: Map
    pathDetails: PathDetailsStoreState
}

/**
 * The popup shown along the selected route when we hover the path detail/elevation graph
 */
export default function PathDetailPopup({ map, pathDetails }: PathDetailPopupProps) {
    const showDistanceInMiles = useContext(ShowDistanceInMilesContext)
    return (
        // todo: use createMapMarker from heightgraph?
        // {createMapMarker(point.elevation, point.description, showDistanceInMiles)}
        <MapPopup map={map} coordinate={pathDetails.pathDetailsPoint ? pathDetails.pathDetailsPoint.point : null}>
            <div className={styles.popup}>
                {pathDetails.pathDetailsPoint && (
                    <p>
                        {metersToText(Math.round(pathDetails.pathDetailsPoint.elevation), showDistanceInMiles, true)}
                        <br />
                        {pathDetails.pathDetailsPoint!.description}
                    </p>
                )}
            </div>
        </MapPopup>
    )
}
