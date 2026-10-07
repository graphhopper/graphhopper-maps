import { SetBikePower, SetVehicleProfile, UpdateSettings } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/SettingsBox.module.css'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import OnIcon from '@/sidebar/toggle_on.svg'
import OffIcon from '@/sidebar/toggle_off.svg'
import { useContext, useEffect, useState } from 'react'
import { SettingsContext } from '@/contexts/SettingsContext'
import { RoutingProfile } from '@/api/graphhopper'
import * as config from 'config'
import { ProfileGroupMap } from '@/utils'
import { clearRecentLocations } from '@/sidebar/search/RecentLocations'
import { PowerSetting } from '@/BikePower'

export default function SettingsBox({
    profile,
    powerSetting,
}: {
    profile: RoutingProfile
    powerSetting: PowerSetting | null
}) {
    const settings = useContext(SettingsContext)

    function setProfile(n: string) {
        Dispatcher.dispatch(new SetVehicleProfile({ name: profile.name === n ? 'car' : n }))
    }

    const groupName = ProfileGroupMap.create(config.profile_group_mapping)[profile.name]
    const group = config.profile_group_mapping[groupName]
    return (
        <div className={styles.parent}>
            {groupName && <span className={styles.groupProfileOptionsHeader}>{tr(groupName + '_settings')}</span>}
            {groupName && (
                <div className={styles.settingsTable}>
                    <div className={styles.groupProfileOptions}>
                        {group.options.map(option => (
                            <div key={option.profile}>
                                <input
                                    checked={profile.name === option.profile}
                                    type="radio"
                                    id={option.profile}
                                    name={groupName}
                                    value={option.profile}
                                    onChange={() => setProfile(option.profile)}
                                />
                                <label htmlFor={option.profile}>{tr(groupName + '_settings_' + option.profile)}</label>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className={styles.title}>{tr('settings')}</div>
            <div className={styles.settingsTable}>
                {powerSetting && <PowerSlider setting={powerSetting} />}
                <SettingsToggle
                    title={tr('distance_unit', [tr(settings.showDistanceInMiles ? 'mi' : 'km')])}
                    enabled={settings.showDistanceInMiles}
                    onClick={() =>
                        Dispatcher.dispatch(new UpdateSettings({ showDistanceInMiles: !settings.showDistanceInMiles }))
                    }
                />
                <SettingsToggle
                    title={tr('save_recent_locations')}
                    enabled={settings.saveRecentLocations}
                    onClick={() => {
                        if (settings.saveRecentLocations) clearRecentLocations()
                        Dispatcher.dispatch(new UpdateSettings({ saveRecentLocations: !settings.saveRecentLocations }))
                    }}
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

// the route is requested when the slider is released, while dragging only the label changes
function PowerSlider({ setting }: { setting: PowerSetting }) {
    const [power, setPower] = useState(setting.power)
    useEffect(() => setPower(setting.power), [setting.power])
    const commit = () => Dispatcher.dispatch(new SetBikePower(power === setting.defaultPower ? null : power))
    // the label column is as wide as the toggle icons of the other settings, the slider aligns with their titles
    return (
        <div className={styles.powerRow} style={{ color: '#5b616a' }}>
            <div>Power</div>
            <div>
                <input
                    type="range"
                    min={setting.min}
                    max={setting.max}
                    step={10}
                    value={power}
                    onChange={e => setPower(Number(e.target.value))}
                    onPointerUp={commit}
                    onKeyUp={commit}
                />
                {power} W
            </div>
            {setting.flatSpeed && (
                <div className={styles.powerInfo}>
                    {setting.flatSpeed(power).toFixed(1)} km/h on the flat
                    {power === setting.defaultPower ? ' (default)' : ''}
                </div>
            )}
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
        <div className={styles.settingsCheckbox}>
            <input type="checkbox" checked={enabled} onChange={onClick}></input>
            <label style={{ color: enabled ? '#5b616a' : 'gray' }}>{title}</label>
        </div>
    )
}
