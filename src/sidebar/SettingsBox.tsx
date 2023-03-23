import { ClearRoute, DismissLastError, SetCustomModelBoxEnabled, ToggleDistanceUnits } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/SettingsBox.module.css'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import OnIcon from '@/sidebar/toggle_on.svg'
import OffIcon from '@/sidebar/toggle_off.svg'
import CustomModelBox from '@/sidebar/CustomModelBox'
import { Settings } from '@/stores/SettingsStore'
import { useContext } from 'react'
import { ShowDistanceInMilesContext } from '@/ShowDistanceInMilesContext'
import { QueryStoreState } from '@/stores/QueryStore'

export default function SettingsBox({
    queryStoreState,
    encodedValues,
    queryOngoing,
    settings,
}: {
    queryStoreState: QueryStoreState
    encodedValues: object[]
    queryOngoing: boolean
    settings: Settings
}) {
    const showDistanceInMiles = useContext(ShowDistanceInMilesContext)
    return !settings.showSettings ? (
        <></>
    ) : (
        <>
            <div className={styles.settingsTable}>
                <PlainButton
                    style={{ color: showDistanceInMiles ? '' : 'lightgray' }}
                    onClick={() => Dispatcher.dispatch(new ToggleDistanceUnits())}
                >
                    {showDistanceInMiles ? <OnIcon /> : <OffIcon />}
                </PlainButton>
                <div style={{ color: showDistanceInMiles ? '#5b616a' : 'gray' }}>
                    {tr('distance_unit', [tr(showDistanceInMiles ? 'mi' : 'km')])}
                </div>
                <PlainButton
                    style={{ color: queryStoreState.customModelEnabled ? '' : 'lightgray' }}
                    onClick={() => {
                        if (queryStoreState.customModelEnabled) Dispatcher.dispatch(new DismissLastError())
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new SetCustomModelBoxEnabled(!queryStoreState.customModelEnabled))
                    }}
                >
                    {queryStoreState.customModelEnabled ? <OnIcon /> : <OffIcon />}
                </PlainButton>
                <div style={{ color: queryStoreState.customModelEnabled ? '#5b616a' : 'gray' }}>
                    {tr('custom model enabled')}
                </div>
                <div>
                    {/*move custom model box outside settingsTable to give it the entire width, i.e. keep this option as last */}
                </div>
            </div>
            {queryStoreState.customModelEnabled && (
                <CustomModelBox
                    encodedValues={encodedValues}
                    queryOngoing={queryOngoing}
                    queryStoreState={queryStoreState}
                    showSettings={settings.showSettings}
                />
            )}
        </>
    )
}
