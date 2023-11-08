import { ToggleDistanceUnits } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/SettingsBox.module.css'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import OnIcon from '@/sidebar/toggle_on.svg'
import OffIcon from '@/sidebar/toggle_off.svg'
import { getSettingsStore } from '@/stores/Stores'

export default function SettingsBox() {
    const settings = getSettingsStore().state

    return (
        <div className={styles.parent}>
            <div className={styles.title}>{tr('settings')}</div>
            <div className={styles.settingsTable}>
                <PlainButton
                    style={{ color: settings.showDistanceInMiles ? '' : 'lightgray' }} // todonow: move to css?
                    onClick={() => Dispatcher.dispatch(new ToggleDistanceUnits())}
                >
                    {settings.showDistanceInMiles ? <OnIcon /> : <OffIcon />}
                </PlainButton>
                <div style={{ color: settings.showDistanceInMiles ? '#5b616a' : 'gray' }}>
                    {tr('distance_unit', [tr(settings.showDistanceInMiles ? 'mi' : 'km')])}
                </div>
            </div>
            <div className={styles.infoLine}>
                <a href="https://www.graphhopper.com/maps-route-planner/">{tr('info')}</a>
                <a href="https://github.com/graphhopper/graphhopper-maps/issues">{tr('feedback')}</a>
                <a href="https://www.graphhopper.com/imprint/">{tr('imprint')}</a>
                <a href="https://www.graphhopper.com/privacy/">{tr('privacy')}</a>
                <a href="https://www.graphhopper.com/terms/">{tr('terms')}</a>
            </div>
        </div>
    )
}
