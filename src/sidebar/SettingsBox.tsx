import { ClearRoute, DismissLastError, SetCustomModelBoxEnabled, ToggleDistanceUnits } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/SettingsBox.module.css'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import { useContext } from 'react'
import OnIcon from '@/sidebar/toggle_on.svg'
import OffIcon from '@/sidebar/toggle_off.svg'
import { SettingsContext } from '@/stores/SettingsStore'
import CustomModelBox from '@/sidebar/CustomModelBox'
import { RequestState } from '@/stores/QueryStore'

export default function SettingsBox({
    encodedValues,
    queryOngoing,
}: {
    encodedValues: object[]
    queryOngoing: boolean
}) {
    const settings = useContext(SettingsContext)
    return !settings.showSettings ? (
        <></>
    ) : (
        <>
            <div className={styles.settingsTable}>
                <PlainButton
                    style={{ color: settings.showDistanceInMiles ? '' : 'lightgray' }}
                    onClick={() => Dispatcher.dispatch(new ToggleDistanceUnits())}
                >
                    {settings.showDistanceInMiles ? <OnIcon /> : <OffIcon />}
                </PlainButton>
                <div style={{ color: settings.showDistanceInMiles ? '#5b616a' : 'gray' }}>
                    {tr('distance_unit', [tr(settings.showDistanceInMiles ? 'mi' : 'km')])}
                </div>
                <PlainButton
                    style={{ color: settings.customModelEnabled ? '' : 'lightgray' }}
                    onClick={() => {
                        if (settings.customModelEnabled) Dispatcher.dispatch(new DismissLastError())
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new SetCustomModelBoxEnabled(!settings.customModelEnabled))
                    }}
                >
                    {settings.customModelEnabled ? <OnIcon /> : <OffIcon />}
                </PlainButton>
                <div style={{ color: settings.customModelEnabled ? '#5b616a' : 'gray' }}>
                    {tr('custom model enabled')}
                </div>
                <div>
                    {/*move custom model box outside settingsTable to give it the entire width, i.e. keep this option as last */}
                </div>
            </div>
            {settings.customModelEnabled && (
                <CustomModelBox encodedValues={encodedValues} queryOngoing={queryOngoing} />
            )}
        </>
    )
}