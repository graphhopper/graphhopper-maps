import React from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { QueryPoint } from '@/stores/QueryStore'
import { AddPoint, ClearRoute, InvalidatePoint, RemovePoint, SetPoint } from '@/actions/Actions'
import RoutingVehicles from '@/sidebar/search/RoutingVehicles'
import RemoveIcon from '../times-solid.svg'
import AddIcon from './plus-circle-solid.svg'
import PlainButton from '@/PlainButton'
import { RoutingVehicle } from '@/api/graphhopper'

import AddressInput from '@/sidebar/search/AddressInput'
import { convertToQueryText } from '@/Converters'

export default function Search({
    points,
    routingVehicles,
    selectedVehicle,
    onFocus,
}: {
    points: QueryPoint[]
    routingVehicles: RoutingVehicle[]
    selectedVehicle: RoutingVehicle
    onFocus: (point: QueryPoint) => void
}) {
    return (
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
                    onFocus={() => onFocus(point)}
                />
            ))}
            <PlainButton
                onClick={() => Dispatcher.dispatch(new AddPoint(points.length, { lat: 0, lng: 0}, false))}
                className={styles.addSearchBox}
            >
                <AddIcon />
                <span>Add Point</span>
            </PlainButton>
            <RoutingVehicles routingVehicles={routingVehicles} selectedVehicle={selectedVehicle} />
        </div>
    )
}

const SearchBox = ({
    point,
    onChange,
    deletable,
    onFocus,
}: {
    point: QueryPoint
    deletable: boolean
    onChange: (value: string) => void
    onFocus: () => void
}) => {
    return (
        <>
            <div className={styles.dot} style={{ backgroundColor: point.color }} />
            <div className={styles.searchBoxInput}>
                <AddressInput
                    point={point}
                    autofocus={false}
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
                    onFocus={onFocus}
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
