import { SetVehicleProfile, UpdateSettings } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/SettingsBox.module.css'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import OnIcon from '@/sidebar/toggle_on.svg'
import OffIcon from '@/sidebar/toggle_off.svg'
import { useContext, useState } from 'react'
import { SettingsContext } from '@/contexts/SettingsContext'
import { RoutingProfile } from '@/api/graphhopper'

export default function SettingsBox({ profile }: { profile: RoutingProfile }) {
    const settings = useContext(SettingsContext)
    function setProfile(n: string) {
        Dispatcher.dispatch(new SetVehicleProfile({ name: profile.name === n ? 'car' : n }))
    }

    return (
        <div className={styles.parent}>
            <div className={styles.title}>{tr('settings')}</div>
            <div className={styles.settingsTable}>
                {/* TODO make generic so that it could be used to collapse e.g. hike & foot */}
                {profile.name.startsWith('car') && (
                    <div className={styles.carProfileOptions}>
                        <span className={styles.carProfileOptionsHeader}>{tr('Avoid')}</span>
                        <div>
                            {/*prettier-ignore*/}
                            <input checked={profile.name === 'car_avoid_motorway'} type="radio" id="motorway" name="car" value="motorway" onClick={e => setProfile('car_avoid_motorway')} />
                            <label htmlFor="motorway">{tr('motorway')}</label>
                        </div>
                        <div>
                            {/*prettier-ignore*/}
                            <input checked={profile.name === 'car_avoid_ferry'} type="radio" id="ferry" name="car" value="ferry" onClick={e => setProfile('car_avoid_ferry')} />
                            <label htmlFor="ferry">{tr('ferry')}</label>
                        </div>
                        <div>
                            {/*prettier-ignore*/}
                            <input checked={profile.name === 'car_avoid_toll'} type="radio" id="toll" name="car" value="toll" onClick={e => setProfile('car_avoid_toll')} />
                            <label htmlFor="toll">{tr('toll and ferry')}</label>
                        </div>
                    </div>
                )}
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
                <div className={styles.settingsCheckboxes}>
                    <SettingsCheckbox
                        title={tr('settings_gpx_export_trk')}
                        enabled={settings.gpxExportTrk}
                        onClick={() =>
                            Dispatcher.dispatch(new UpdateSettings({ gpxExportTrk: !settings.gpxExportTrk }))
                        }
                    />

                    <SettingsCheckbox
                        title={tr('settings_gpx_export_rte')}
                        enabled={settings.gpxExportRte}
                        onClick={() =>
                            Dispatcher.dispatch(new UpdateSettings({ gpxExportRte: !settings.gpxExportRte }))
                        }
                    />

                    <SettingsCheckbox
                        title={tr('settings_gpx_export_wpt')}
                        enabled={settings.gpxExportWpt}
                        onClick={() =>
                            Dispatcher.dispatch(new UpdateSettings({ gpxExportWpt: !settings.gpxExportWpt }))
                        }
                    />
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

function SettingsToggle({ title, enabled, onClick }: { title: string; enabled: boolean; onClick: () => void }) {
    return (
        <div className={styles.settingsToggle} onClick={onClick}>
            <PlainButton style={{ color: enabled ? '' : 'lightgray' }} className={styles.toggleButton}>
                {enabled ? <OnIcon /> : <OffIcon />}
            </PlainButton>
            <div style={{ color: enabled ? '#5b616a' : 'gray' }}>{title}</div>
        </div>
    )
}

function SettingsCheckbox({ title, enabled, onClick }: { title: string; enabled: boolean; onClick: () => void }) {
    return (
        <div className={styles.settingsCheckbox} onClick={onClick}>
            <input type="checkbox" checked={enabled} onChange={ignore => {}}></input>
            <label style={{ color: enabled ? '#5b616a' : 'gray' }}>{title}</label>
        </div>
    )
}
