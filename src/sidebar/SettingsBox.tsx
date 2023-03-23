import { ClearRoute, DismissLastError, SetCustomModelEnabled, ToggleDistanceUnits } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/SettingsBox.module.css'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import OnIcon from '@/sidebar/toggle_on.svg'
import OffIcon from '@/sidebar/toggle_off.svg'
import { useContext } from 'react'
import { ShowDistanceInMilesContext } from '@/ShowDistanceInMilesContext'
import { QueryStoreState } from '@/stores/QueryStore'

export default function SettingsBox({ queryStoreState }: { queryStoreState: QueryStoreState }) {
    const showDistanceInMiles = useContext(ShowDistanceInMilesContext)
    return (
        <>
            <div className={styles.settingsTable}>
                <PlainButton
                    style={{ color: showDistanceInMiles ? '' : 'lightgray' }} // todonow: move to css?
                    onClick={() => Dispatcher.dispatch(new ToggleDistanceUnits())}
                >
                    {showDistanceInMiles ? <OnIcon /> : <OffIcon />}
                </PlainButton>
                {/*todonow: move to css?*/}
                <div style={{ color: showDistanceInMiles ? '#5b616a' : 'gray' }}>
                    {tr('distance_unit', [tr(showDistanceInMiles ? 'mi' : 'km')])}
                </div>
                <PlainButton
                    // todonow: move to css?
                    style={{ color: queryStoreState.customModelEnabled ? '' : 'lightgray' }}
                    onClick={() => {
                        if (queryStoreState.customModelEnabled) Dispatcher.dispatch(new DismissLastError())
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new SetCustomModelEnabled(!queryStoreState.customModelEnabled))
                    }}
                >
                    {queryStoreState.customModelEnabled ? <OnIcon /> : <OffIcon />}
                </PlainButton>
                {/* todonow: move to css? */}
                <div style={{ color: queryStoreState.customModelEnabled ? '#5b616a' : 'gray' }}>
                    {tr('custom_model_enabled')}
                </div>
            </div>
        </>
    )
}
