import { useContext } from 'react'
import styles from '@/layers/DefaultMapPopup.module.css'
import { PathDetailsStoreState } from '@/stores/PathDetailsStore'
import { metersToText } from '@/Converters'
import MapPopup from '@/layers/MapPopup'
import { Map } from 'ol'
import { SettingsContext } from '@/contexts/SettingsContext'

interface PathDetailPopupProps {
    map: Map
    pathDetails: PathDetailsStoreState
}

/**
 * The popup shown along the selected route when we hover the path detail/elevation graph
 */
export default function PathDetailPopup({ map, pathDetails }: PathDetailPopupProps) {
    const settings = useContext(SettingsContext)
    const p = pathDetails.pathDetailsPoint
    const miles = settings.showDistanceInMiles
    return (
        <MapPopup map={map} coordinate={p ? p.point : null}>
            <div className={styles.detailPopup}>
                {p && (p.description ? (
                    <>
                        <div className={styles.detailPopupValue}>
                            {p.color && <span className={styles.colorDot} style={{ background: p.color }} />}
                            {p.description}
                        </div>
                        {p.distance != null && (
                            <div>{metersToText(Math.round(p.distance), miles)}</div>
                        )}
                    </>
                ) : (
                    <>
                        <div>{metersToText(Math.round(p.elevation), miles, true)}</div>
                        {p.incline != null && (
                            <div>
                                <span className={styles.colorDot} style={{ background: p.color }} />
                                {p.incline >= 0 ? '+' : ''}{Math.round(p.incline * 10) / 10} %
                            </div>
                        )}
                        {p.distance != null && (
                            <div>{metersToText(Math.round(p.distance), miles)}</div>
                        )}
                    </>
                ))}
            </div>
        </MapPopup>
    )
}
