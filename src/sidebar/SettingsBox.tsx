import { QueryStoreState, RequestState } from '@/stores/QueryStore'
import CustomModelBox from '@/sidebar/CustomModelBox'
import { ClearRoute, DismissLastError, SetCustomModelBoxEnabled, ToggleDistanceUnits } from '@/actions/Actions'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/SettingsBox.module.css'
import { tr } from '@/translation/Translation'
import PlainButton from '@/PlainButton'
import { useContext } from 'react'
import { SettingsContext } from '@/SettingsContext'

export default function SettingsBox({ query, encodedValues }: { query: QueryStoreState; encodedValues: object[] }) {
    const settings = useContext(SettingsContext)
    return !settings.showSettings ? (
        <></>
    ) : (
        <>
            <PlainButton
                className={styles.mileskm}
                title={tr('distance_unit', [tr(settings.showDistanceInMiles ? 'miles' : 'kilometer')])}
                onClick={() => Dispatcher.dispatch(new ToggleDistanceUnits())}
            >
                {tr('distance_unit', [tr(settings.showDistanceInMiles ? 'miles' : 'kilometer')])}
            </PlainButton>
            <div>
            <input
                name="customModelEnabled"
                type="checkbox"
                checked={query.customModelEnabled}
                onChange={() => {
                    if (query.customModelEnabled) Dispatcher.dispatch(new DismissLastError())
                    Dispatcher.dispatch(new ClearRoute())
                    Dispatcher.dispatch(new SetCustomModelBoxEnabled(!query.customModelEnabled))
                }}
            />{' '}
            <div>custom model</div>
            </div>
            <CustomModelBox
                enabled={query.customModelEnabled}
                encodedValues={encodedValues}
                initialCustomModelStr={query.initialCustomModelStr}
                queryOngoing={query.currentRequest.subRequests[0]?.state === RequestState.SENT}
            />
        </>
    )
}
