import React from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { AddPoint, ClearRoute, InvalidatePoint, RemovePoint, SetPoint } from '@/actions/Actions'
import RoutingProfiles from '@/sidebar/search/RoutingProfiles'
import RemoveIcon from '../times-solid.svg'
import AddIcon from './plus-circle-solid.svg'
import PlainButton from '@/PlainButton'
import { RoutingProfile } from '@/api/graphhopper'

import AddressInput from '@/sidebar/search/AddressInput'
import { convertToQueryText } from '@/Converters'
import Api from '@/api/Api'

export default function Search({
    points,
    api,
    routingProfiles,
    selectedProfile,
    autofocus,
}: {
    points: QueryPoint[]
    api: Api
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
    autofocus: boolean
}) {
    points.every(point => point.isInitialized)
    return (
        <div className={styles.searchBox}>
            {points.map(point => (
                <SearchBox
                    key={point.id}
                    point={point}
                    api={api}
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
            </PlainButton>
            <RoutingProfiles routingProfiles={routingProfiles} selectedProfile={selectedProfile} />
        </div>
    )
}

const SearchBox = ({
    point,
    api,
    onChange,
    deletable,
    autofocus,
}: {
    point: QueryPoint
    api: Api
    deletable: boolean
    onChange: (value: string) => void
    autofocus: boolean
}) => {
    return (
        <>
            <div className={styles.dot} style={{ backgroundColor: point.color }} />
            <div className={styles.searchBoxInput}>
                <AddressInput
                    point={point}
                    autofocus={autofocus}
                    api={api}
                    onCancel={() => console.log('cancel')}
                    onAddressSelected={hit =>
                        Dispatcher.dispatch(
                            new SetPoint({
                                ...point,
                                isInitialized: true,
                                queryText: convertToQueryText(hit),
                                coordinate: hit.point,
                            })
                        )
                    }
                    onChange={onChange}
                />
            </div>
            {deletable && (
                <PlainButton
                    onClick={() => Dispatcher.dispatch(new RemovePoint(point))}
                    className={styles.removeSearchBox}
                >
                    <RemoveIcon />
                </PlainButton>
            )}
        </>
    )
}
