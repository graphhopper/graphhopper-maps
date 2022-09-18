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
    let [moveStartIndex, onMoveStartSelect] = useState(-1)
    let [dropPreviewIndex, onDropPreviewSelect] = useState(-1)

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
                    showTargetIcon={showTargetIcon}
                    moveStartIndex={moveStartIndex}
                    onMoveStartSelect={(index, showTarget) => {
                        onMoveStartSelect(index)
                        setShowTargetIcon(showTarget)
                    }}
                    dropPreviewIndex={dropPreviewIndex}
                    onDropPreviewSelect={onDropPreviewSelect}
                />
            ))}
            <PlainButton
                style={
                    showTargetIcon && moveStartIndex >= 0 && moveStartIndex + 1 < points.length
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
    moveStartIndex,
    showTargetIcon,
    onMoveStartSelect,
    dropPreviewIndex,
    onDropPreviewSelect,
}: {
    index: number
    points: QueryPoint[]
    deletable: boolean
    onChange: (value: string) => void
    autofocus: boolean
    moveStartIndex: number
    showTargetIcon: boolean
    onMoveStartSelect: (index: number, showTargetIcon: boolean) => void
    dropPreviewIndex: number
    onDropPreviewSelect: (index: number) => void
}) => {
    let point = points[index]

    function onClickOrDrop() {
        onDropPreviewSelect(-1)
        let newIndex = moveStartIndex < index ? index + 1 : index
        Dispatcher.dispatch(new MovePoint(points[moveStartIndex], newIndex))
        onMoveStartSelect(index, false)
        setTimeout(() => {
            onMoveStartSelect(-1, true)
        }, 1000)
    }

    return (
        <>
            {(moveStartIndex < 0 || moveStartIndex == index) && (
                <div
                    title={tr('click to move input')}
                    className={styles.markerContainer}
                    draggable
                    onDragStart={e => {
                        // do not set to -1 if we start dragging when already selected
                        if (moveStartIndex != index) onMoveStartSelect(index, true)
                    }}
                    onClick={e => {
                        if (moveStartIndex == index) onMoveStartSelect(-1, true)
                        else onMoveStartSelect(index, true)
                    }}
                >
                    <MarkerComponent
                        number={index > 0 && index + 1 < points.length ? index : undefined}
                        color={moveStartIndex >= 0 ? 'gray' : point.color}
                    />
                </div>
            )}
            {moveStartIndex >= 0 && moveStartIndex != index && (
                <PlainButton
                    title={tr('click to move selected input here')}
                    className={[
                        styles.markerTarget,
                        dropPreviewIndex >= 0 && dropPreviewIndex == index ? styles.dropPreview : '',
                        showTargetIcon ? '' : styles.hide,
                    ].join(' ')}
                    style={moveStartIndex > index ? { marginTop: '-2.3rem' } : { marginBottom: '-2.3rem' }}
                    onDragEnter={e => e.preventDefault()}
                    onDragOver={e => {
                        e.preventDefault()
                        onDropPreviewSelect(index)
                    }}
                    onDragExit={e => onDropPreviewSelect(-1)}
                    onDrop={onClickOrDrop}
                    onClick={onClickOrDrop}
                >
                    <InsertIcon />
                </PlainButton>
            )}
            <div className={styles.searchBoxInput}>
                <AddressInput
                    moveStartIndex={moveStartIndex}
                    dropPreviewIndex={dropPreviewIndex}
                    index={index}
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
                    clearSelectedInputMarker={() => onMoveStartSelect(-1, true)}
                    onChange={onChange}
                />
            </div>
            {deletable && (
                <PlainButton
                    title={tr('delete_from_route')}
                    onClick={() => {
                        Dispatcher.dispatch(new RemovePoint(point))
                        onMoveStartSelect(-1, true)
                    }}
                    className={styles.removeSearchBox}
                >
                    <RemoveIcon />
                </PlainButton>
            )}
        </>
    )
}
