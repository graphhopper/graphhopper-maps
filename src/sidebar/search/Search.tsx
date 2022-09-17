import React, { useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { AddPoint, ClearRoute, InvalidatePoint, MovePoint, RemovePoint, SetPoint } from '@/actions/Actions'
import RoutingProfiles from '@/sidebar/search/routingProfiles/RoutingProfiles'
import RemoveIcon from './minus-circle-solid.svg'
import AddIcon from './plus-circle-solid.svg'
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
    let [showTargetIcon, setShowTargetIcon] = useState(true)
    let [selectedInputMarkerIndex, onInputMarkerSelect] = useState(-1)

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
                    selectedIndex={selectedInputMarkerIndex}
                    showTargetIcon={showTargetIcon}
                    onInputMarkerSelect={(index, showTarget) => {
                        onInputMarkerSelect(index)
                        setShowTargetIcon(showTarget)
                    }}
                />
            ))}
            <PlainButton
                style={
                    showTargetIcon && selectedInputMarkerIndex >= 0 && selectedInputMarkerIndex + 1 < points.length
                        ? { paddingTop: '2rem' }
                        : {}
                }
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
    showTargetIcon,
    onInputMarkerSelect,
}: {
    index: number
    points: QueryPoint[]
    deletable: boolean
    onChange: (value: string) => void
    autofocus: boolean
    selectedIndex: number
    showTargetIcon: boolean
    onInputMarkerSelect: (index: number, showTargetIcon: boolean) => void
}) => {
    let point = points[index]

    return (
        <>
            {selectedIndex < 0 && (
                <div
                    title={tr('click to move input')}
                    className={styles.markerContainer}
                    onClick={() => onInputMarkerSelect(index, true)}
                >
                    <MarkerComponent
                        number={index > 0 && index + 1 < points.length ? index : undefined}
                        color={point.color}
                    />
                </div>
            )}
            {selectedIndex >= 0 && selectedIndex == index && (
                <PlainButton
                    title={tr('selected input')}
                    className={styles.markerSelected}
                    onMouseDown={() => onInputMarkerSelect(-1, true)}
                >
                    <MarkerComponent
                        number={index > 0 && index + 1 < points.length ? index : undefined}
                        color={'gray'}
                    />
                </PlainButton>
            )}
            {selectedIndex >= 0 && selectedIndex != index && (
                <PlainButton
                    title={tr('click to move selected input here')}
                    className={styles.markerTarget}
                    style={
                        !showTargetIcon
                            ? { visibility: 'hidden' }
                            : selectedIndex > index
                            ? { marginTop: '-2.3rem' }
                            : { marginBottom: '-2.3rem' }
                    }
                    onClick={() => {
                        let newIndex = selectedIndex < index ? index + 1 : index
                        Dispatcher.dispatch(new MovePoint(points[selectedIndex], newIndex))
                        onInputMarkerSelect(index, false)
                        setTimeout(() => {
                            onInputMarkerSelect(-1, true)
                        }, 2000)
                    }}
                >
                    <InsertIcon />
                </PlainButton>
            )}
            <div className={styles.searchBoxInput}>
                <AddressInput
                    selectedInputMarkerSelected={selectedIndex == index}
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
                    clearSelectedInputMarker={() => onInputMarkerSelect(-1, true)}
                    onChange={onChange}
                />
            </div>
            {deletable && (
                <PlainButton
                    title={tr('delete_from_route')}
                    onClick={() => {
                        Dispatcher.dispatch(new RemovePoint(point))
                        onInputMarkerSelect(-1, true)
                    }}
                    className={styles.removeSearchBox}
                >
                    <RemoveIcon />
                </PlainButton>
            )}
        </>
    )
}
