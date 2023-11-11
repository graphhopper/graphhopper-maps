import { UpdateSettings } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/SettingsBox.module.css'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import OnIcon from '@/sidebar/toggle_on.svg'
import OffIcon from '@/sidebar/toggle_off.svg'
import { useContext } from 'react'
import { SettingsContext } from '@/contexts/SettingsContext'

export default function SettingsBox() {
    const settings = useContext(SettingsContext)

    return (
        <div className={styles.parent}>
            <div className={styles.title}>{tr('settings')}</div>
            <div className={styles.settingsTable}>
                <SettingsToggle
                    title={tr('distance_unit', [tr(settings.showDistanceInMiles ? 'mi' : 'km')])}
                    enabled={settings.showDistanceInMiles}
                    onClick={() =>
                        Dispatcher.dispatch(new UpdateSettings({ showDistanceInMiles: !settings.showDistanceInMiles }))
                    }
                />
            </div>
            <div className={styles.title}>{tr('settings_gpx_export')}</div>
            <div className={styles.settingsTable}>
                <SettingsToggle
                    title={tr('settings_gpx_export_trk')}
                    enabled={settings.gpx_export_trk}
                    onClick={() =>
                        Dispatcher.dispatch(new UpdateSettings({ gpx_export_trk: !settings.gpx_export_trk }))
                    }
                />

                <SettingsToggle
                    title={tr('settings_gpx_export_rte')}
                    enabled={settings.gpx_export_rte}
                    onClick={() =>
                        Dispatcher.dispatch(new UpdateSettings({ gpx_export_rte: !settings.gpx_export_rte }))
                    }
                />

                <SettingsToggle
                    title={tr('settings_gpx_export_wpt')}
                    enabled={settings.gpx_export_wpt}
                    onClick={() =>
                        Dispatcher.dispatch(new UpdateSettings({ gpx_export_wpt: !settings.gpx_export_wpt }))
                    }
                />
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

function SettingsToggle({ title, enabled, onClick }: { title: string; enabled: boolean; onClick: () => void }) {
    return (
        <div className={styles.settingsToggle}>
            <PlainButton
                style={{ color: enabled ? '' : 'lightgray' }} // todonow: move to css?
                onClick={onClick}
                className={styles.toggleButton}
            >
                {enabled ? <OnIcon /> : <OffIcon />}
            </PlainButton>
            <div style={{ color: enabled ? '#5b616a' : 'gray' }}>{tr(title)}</div>
        </div>
    )
}
