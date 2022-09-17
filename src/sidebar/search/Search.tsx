import React, { useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { AddPoint, ClearRoute, InvalidatePoint, MovePoint, RemovePoint, SetPoint } from '@/actions/Actions'
import RoutingProfiles from '@/sidebar/search/routingProfiles/RoutingProfiles'
import RemoveIcon from './minus-circle-solid.svg'
import AddIcon from './plus-circle-solid.svg'
import SelectedIcon from './radio-button-checked.svg'
import InsertIcon from './send.svg'
import PlainButton from '@/PlainButton'
import { RoutingProfile } from '@/api/graphhopper'

import AddressInput from '@/sidebar/search/AddressInput'
import { MarkerComponent } from '@/map/Marker'
import { tr } from '@/translation/Translation'

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
    let [selectedIndex, setSelectedIndex] = useState(-1)

    function onSelect(idx: number) {
        setSelectedIndex(idx)
    }

    return (
        <div className={styles.searchBox}>
            <RoutingProfiles routingProfiles={routingProfiles} selectedProfile={selectedProfile} />
            {points.map((point, index) => (
                <SearchBox
                    key={point.id}
                    index={index}
                    points={points}
                    deletable={points.length > 2}
                    onChange={() => {
                        Dispatcher.dispatch(new ClearRoute())
                        Dispatcher.dispatch(new InvalidatePoint(point))
                    }}
                    autofocus={point.type === QueryPointType.From && autofocus}
                    selectedIndex={selectedIndex}
                    onSelect={onSelect}
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
    index,
    points,
    onChange,
    deletable,
    autofocus,
    selectedIndex,
    onSelect,
}: {
    index: number
    points: QueryPoint[]
    deletable: boolean
    onChange: (value: string) => void
    autofocus: boolean
    selectedIndex: number
    onSelect: (value: number) => void
}) => {
    let point = points[index]

    return (
        <>
            {selectedIndex < 0 && (
                <div
                    title={tr('click to move input')}
                    className={styles.markerContainer}
                    onClick={() => onSelect(index)}
                >
                    <MarkerComponent color={point.color} />
                </div>
            )}
            {selectedIndex >= 0 && selectedIndex == index && (
                <PlainButton
                    title={tr('selected input')}
                    className={styles.markerSelected}
                    onClick={() => onSelect(-1)}
                >
                    <SelectedIcon />
                </PlainButton>
            )}
            {selectedIndex >= 0 && selectedIndex != index && (
                <PlainButton
                    title={tr('click to move selected input here')}
                    className={styles.markerTarget}
                    style={selectedIndex > index ? { padding: '0 0 30px 0' } : { padding: '30px 0 0 0' }}
                    onClick={() => {
                        Dispatcher.dispatch(
                            new MovePoint(points[selectedIndex], selectedIndex < index ? index + 1 : index)
                        )
                        onSelect(-1)
                    }}
                >
                    <InsertIcon />
                </PlainButton>
            )}
            <div className={styles.searchBoxInput}>
                <AddressInput
                    point={point}
                    autofocus={autofocus}
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
