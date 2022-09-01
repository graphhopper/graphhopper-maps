import React from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { AddPoint, ClearRoute, InvalidatePoint, RemovePoint, SetPoint } from '@/actions/Actions'
import RoutingProfiles from '@/sidebar/search/routingProfiles/RoutingProfiles'
import RemoveIcon from './minus-circle-solid.svg'
import AddIcon from './plus-circle-solid.svg'
import PlainButton from '@/PlainButton'
import { RoutingProfile } from '@/api/graphhopper'

import AddressInput from '@/sidebar/search/AddressInput'
import { MarkerComponent } from '@/map/Marker'
import {tr} from "@/translation/Translation";

export default function Search({
    points,
    routingProfiles,
    selectedProfile,
    autofocus,
}: {
    points: QueryPoint[]
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
    autofocus: boolean
}) {
    points.every(point => point.isInitialized)
    return (
        <div className={styles.searchBox}>
            <RoutingProfiles routingProfiles={routingProfiles} selectedProfile={selectedProfile} />
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
            <PlainButton
                onClick={() => Dispatcher.dispatch(new AddPoint(points.length, { lat: 0, lng: 0 }, false))}
                className={styles.addSearchBox}
            >
                <AddIcon />
                <div>{tr("Add Location")}</div>
            </PlainButton>
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
                    title={tr("Remove Stop")}
                    onClick={() => Dispatcher.dispatch(new RemovePoint(point))}
                    className={styles.removeSearchBox}
                >
                    <RemoveIcon />
                </PlainButton>
            )}
        </>
    )
}
