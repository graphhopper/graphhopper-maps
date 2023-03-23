import { ToggleDistanceUnits } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/SettingsBox.module.css'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import OnIcon from '@/sidebar/toggle_on.svg'
import OffIcon from '@/sidebar/toggle_off.svg'
import { useContext } from 'react'
import { ShowDistanceInMilesContext } from '@/ShowDistanceInMilesContext'

export default function SettingsBox() {
    const showDistanceInMiles = useContext(ShowDistanceInMilesContext)
    return (
        <div className={styles.parent}>
            <div className={styles.title}>{tr('settings')}</div>
            <div className={styles.settingsTable}>
                <PlainButton
                    style={{ color: showDistanceInMiles ? '' : 'lightgray' }} // todonow: move to css?
                    onClick={() => Dispatcher.dispatch(new ToggleDistanceUnits())}
                >
                    {showDistanceInMiles ? <OnIcon /> : <OffIcon />}
                </PlainButton>
                <div style={{ color: showDistanceInMiles ? '#5b616a' : 'gray' }}>
                    {tr('distance_unit', [tr(showDistanceInMiles ? 'mi' : 'km')])}
                </div>
            </div>
            <div className={styles.infoLine}>
                <a href="https://www.graphhopper.com/maps-route-planner/">Info</a>
                <a href="https://github.com/graphhopper/graphhopper-maps/issues">Feedback</a>
                <a href="https://www.graphhopper.com/imprint/">Imprint</a>
                <a href="https://www.graphhopper.com/privacy/">Privacy</a>
                <a href="https://www.graphhopper.com/terms/">Terms</a>
            </div>
        </div>
    )
}
