import React from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import {
    AddPoint,
    ClearRoute,
    DismissLastError,
    InvalidatePoint,
    RemovePoint,
    SetCustomModelBoxEnabled,
    SetPoint,
} from '@/actions/Actions'
import RoutingProfiles from '@/sidebar/search/routingProfiles/RoutingProfiles'
import RemoveIcon from './minus-circle-solid.svg'
import AddIcon from './plus-circle-solid.svg'
import PlainButton from '@/PlainButton'
import { RoutingProfile } from '@/api/graphhopper'

import AddressInput from '@/sidebar/search/AddressInput'
import { MarkerComponent } from '@/map/Marker'
import { tr } from '@/translation/Translation'
import SettingsSVG from '@/sidebar/settings.svg'

export default function Search({
    points,
    routingProfiles,
    selectedProfile,
    autofocus,
    customModelAllowed,
    customModelEnabled,
}: {
    points: QueryPoint[]
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
    autofocus: boolean
    customModelAllowed: boolean
    customModelEnabled: boolean
}) {
    points.every(point => point.isInitialized)
    return (
        <div className={styles.searchBoxParent}>
            <RoutingProfiles routingProfiles={routingProfiles} selectedProfile={selectedProfile} />
            <div className={styles.searchBox}>
                {points.map(point => (
                    <SearchBox
                        key={point.id}
                        point={point}
                        deletable={points.length > 2}
                        onChange={() => {
                            Dispatcher.dispatch(new ClearRoute())
                            Dispatcher.dispatch(new InvalidatePoint(point))
                        }}
                        autofocus={point.type === QueryPointType.From && autofocus}
                    />
                ))}
            </div>
            <div className={styles.lastSearchLine}>
                <PlainButton
                    className={styles.addSearchBox}
                    onClick={() => Dispatcher.dispatch(new AddPoint(points.length, { lat: 0, lng: 0 }, false))}
                >
                    <AddIcon />
                    <div>{tr('add_to_route')}</div>
                </PlainButton>
                {
                    // The custom-model button should be visually on one line with the add_to_route button. So either we accept*/}
                    // that CSS is a bit hacky (margin negative and extra empty div) or we move it to this Search component.*/}
                    // See issue #TODO
                    customModelAllowed && (
                        <PlainButton
                            title={tr('open_custom_model_box')}
                            className={customModelEnabled ? styles.enabledSettings : styles.settings}
                            onClick={() => {
                                if (customModelEnabled) Dispatcher.dispatch(new DismissLastError())
                                Dispatcher.dispatch(new ClearRoute())
                                Dispatcher.dispatch(new SetCustomModelBoxEnabled(!customModelEnabled))
                            }}
                        >
                            <SettingsSVG />
                        </PlainButton>
                    )
                }
            </div>
        </div>
    )
}

const SearchBox = ({
    point,
    onChange,
    deletable,
    autofocus,
}: {
    point: QueryPoint
    deletable: boolean
    onChange: (value: string) => void
    autofocus: boolean
}) => {
    return (
        <>
            <div className={styles.markerContainer}>
                <MarkerComponent color={point.color} />
            </div>
            <div className={styles.searchBoxInput}>
                <AddressInput
                    point={point}
                    autofocus={autofocus}
                    onCancel={() => console.log('cancel')}
                    onAddressSelected={(queryText, coordinate) =>
                        Dispatcher.dispatch(
                            coordinate
                                ? new SetPoint(
                                      {
                                          ...point,
                                          isInitialized: true,
                                          queryText: queryText,
                                          coordinate: coordinate,
                                      },
                                      true
                                  )
                                : new SetPoint(
                                      {
                                          ...point,
                                          isInitialized: false,
                                          queryText: queryText,
                                      },
                                      true
                                  )
                        )
                    }
                    onChange={onChange}
                />
            </div>
            {deletable && (
                <PlainButton
                    title={tr('delete_from_route')}
                    onClick={() => Dispatcher.dispatch(new RemovePoint(point))}
                    className={styles.removeSearchBox}
                >
                    <RemoveIcon />
                </PlainButton>
            )}
        </>
    )
}
