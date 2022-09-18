import React, { useEffect, useRef } from 'react'
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
import { tr } from '@/translation/Translation'

export default function Search({
    points,
    routingProfiles,
    selectedProfile,
}: {
    points: QueryPoint[]
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
}) {
    return (
        <div className={styles.searchBox}>
            <RoutingProfiles routingProfiles={routingProfiles} selectedProfile={selectedProfile} />
            {points.map((point, index) => (
                <SearchBox
                    key={point.id}
                    index={index}
                    point={point}
                    deletable={points.length > 2}
                    onChange={() => {
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new InvalidatePoint(point))
                    }}
                />
            ))}
            <PlainButton
                onClick={() => Dispatcher.dispatch(new AddPoint(points.length, { lat: 0, lng: 0 }, false))}
                className={styles.addSearchBox}
            >
                <AddIcon />
                <div>{tr('add_to_route')}</div>
            </PlainButton>
        </div>
    )
}

const SearchBox = ({
    point,
    index,
    onChange,
    deletable,
}: {
    point: QueryPoint
    index: number
    deletable: boolean
    onChange: (value: string) => void
}) => {
    // With this ref and tabIndex=-1 we ensure that the first 'TAB' gives the focus the first input but the marker won't be included in the TAB sequence, #194
    const myMarkerRef = useRef<HTMLDivElement>(null)
    if (index == 0)
        useEffect(() => {
            myMarkerRef.current?.focus()
        }, [])

    return (
        <>
            <div ref={myMarkerRef} className={styles.markerContainer} tabIndex={-1}>
                <MarkerComponent color={point.color} />
            </div>
            <div className={styles.searchBoxInput}>
                <AddressInput
                    point={point}
                    onCancel={() => console.log('cancel')}
                    onAddressSelected={(queryText, coordinate) =>
                        Dispatcher.dispatch(
                            new SetPoint(
                                {
                                    ...point,
                                    isInitialized: !!coordinate,
                                    queryText: queryText,
                                    coordinate: coordinate ? coordinate : point.coordinate,
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
