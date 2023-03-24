import { ToggleDistanceUnits, ToggleFullScreenForNavigation, ToggleVectorTilesForNavigation } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/SettingsBox.module.css'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import OnIcon from '@/sidebar/toggle_on.svg'
import OffIcon from '@/sidebar/toggle_off.svg'
import { useContext } from 'react'
import { ShowDistanceInMilesContext } from '@/ShowDistanceInMilesContext'
import { TNSettingsState } from '@/stores/TurnNavigationStore'

export default function SettingsBox({ turnNavSettings }: { turnNavSettings: TNSettingsState }) {
    const showDistanceInMiles = useContext(ShowDistanceInMilesContext)
    const { forceVectorTiles, fullScreen } = turnNavSettings
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
            <div className={styles.title}>{tr('turn_navigation_settings_title')}</div>
            <div className={styles.settingsTable}>
                <PlainButton
                    style={{ color: forceVectorTiles ? '' : 'lightgray' }}
                    onClick={() => Dispatcher.dispatch(new ToggleVectorTilesForNavigation())}
                >
                    {forceVectorTiles ? <OnIcon /> : <OffIcon />}
                </PlainButton>
                <div style={{ color: forceVectorTiles ? '#5b616a' : 'gray' }}>{tr('vector_tiles_for_navigation')}</div>
                <PlainButton
                    style={{ color: fullScreen ? '' : 'lightgray' }}
                    onClick={() => Dispatcher.dispatch(new ToggleFullScreenForNavigation())}
                >
                    {fullScreen ? <OnIcon /> : <OffIcon />}
                </PlainButton>
                <div style={{ color: fullScreen ? '#5b616a' : 'gray' }}>{tr('full_screen_for_navigation')}</div>
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
