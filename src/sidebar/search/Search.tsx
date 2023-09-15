import { useEffect, useRef, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { getBBoxFromCoord, QueryPoint } from '@/stores/QueryStore'
import { AddPoint, ClearRoute, InvalidatePoint, MovePoint, RemovePoint, SetBBox, SetPoint } from '@/actions/Actions'
import RemoveIcon from './minus-circle-solid.svg'
import AddIcon from './plus-circle-solid.svg'
import TargetIcon from './send.svg'
import PlainButton from '@/PlainButton'

import AddressInput from '@/sidebar/search/AddressInput'
import { MarkerComponent } from '@/map/Marker'
import { tr } from '@/translation/Translation'
import SettingsBox from '@/sidebar/SettingsBox'

export default function Search({ points }: { points: QueryPoint[] }) {
    const [showSettings, setShowSettings] = useState(false)
    const [showTargetIcons, setShowTargetIcons] = useState(true)
    const [moveStartIndex, onMoveStartSelect] = useState(-1)
    const [dropPreviewIndex, onDropPreviewSelect] = useState(-1)

    return (
        <div className={styles.searchBoxParent}>
            <div className={styles.searchBox}>
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
                        showTargetIcons={showTargetIcons}
                        moveStartIndex={moveStartIndex}
                        onMoveStartSelect={(index, showTarget) => {
                            onMoveStartSelect(index)
                            setShowTargetIcons(showTarget)
                        }}
                        dropPreviewIndex={dropPreviewIndex}
                        onDropPreviewSelect={onDropPreviewSelect}
                    />
                ))}
            </div>
            <div className={styles.lastSearchLine}>
                <PlainButton
                    style={
                        showTargetIcons && moveStartIndex >= 0 && moveStartIndex + 1 < points.length
                            ? { paddingTop: '2rem' }
                            : {}
                    }
                    onClick={() => Dispatcher.dispatch(new AddPoint(points.length, { lat: 0, lng: 0 }, false))}
                    className={styles.addSearchBox}
                >
                    <AddIcon />
                    <div>{tr('add_to_route')}</div>
                </PlainButton>
                <PlainButton className={styles.settingsButton} onClick={() => setShowSettings(!showSettings)}>
                    {showSettings ? tr('settings_close') : tr('settings')}
                </PlainButton>
            </div>
            {showSettings && <SettingsBox />}
        </div>
    )
}

const SearchBox = ({
    index,
    points,
    onChange,
    deletable,
    moveStartIndex,
    showTargetIcons,
    onMoveStartSelect,
    dropPreviewIndex,
    onDropPreviewSelect,
}: {
    index: number
    points: QueryPoint[]
    deletable: boolean
    onChange: (value: string) => void
    moveStartIndex: number
    showTargetIcons: boolean
    onMoveStartSelect: (index: number, showTargetIcon: boolean) => void
    dropPreviewIndex: number
    onDropPreviewSelect: (index: number) => void
}) => {
    const point = points[index]

    // With this ref and tabIndex=-1 we ensure that the first 'TAB' gives the focus the first input but the marker won't be included in the TAB sequence, #194
    const myMarkerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (index == 0) myMarkerRef.current?.focus()
    }, [])

    function onClickOrDrop() {
        onDropPreviewSelect(-1)
        const newIndex = moveStartIndex < index ? index + 1 : index
        Dispatcher.dispatch(new MovePoint(points[moveStartIndex], newIndex))
        onMoveStartSelect(index, false) // temporarily hide target icons
        setTimeout(() => {
            onMoveStartSelect(-1, true)
        }, 1000)
    }

    return (
        <>
            {(moveStartIndex < 0 || moveStartIndex == index) && (
                <div
                    ref={myMarkerRef}
                    tabIndex={-1}
                    title={tr('drag_to_reorder')}
                    className={styles.markerContainer}
                    draggable
                    onDragStart={() => {
                        // do not set to dropPreview to -1 if we start dragging when already selected
                        if (moveStartIndex != index) {
                            onMoveStartSelect(index, true)
                            onDropPreviewSelect(-1)
                        }
                    }}
                    onDragEnd={() => {
                        onMoveStartSelect(-1, true)
                        onDropPreviewSelect(-1)
                    }}
                    onClick={() => {
                        if (moveStartIndex == index) {
                            onMoveStartSelect(-1, true)
                            onDropPreviewSelect(-1)
                        } else onMoveStartSelect(index, true)
                    }}
                >
                    <MarkerComponent
                        number={index > 0 && index + 1 < points.length ? index : undefined}
                        cursor="ns-resize"
                        color={moveStartIndex >= 0 ? 'gray' : point.color}
                    />
                </div>
            )}
            {moveStartIndex >= 0 && moveStartIndex != index && (
                <PlainButton
                    title={tr('click to move selected input here')}
                    className={[
                        showTargetIcons ? '' : styles.hide,
                        styles.markerTarget,
                        dropPreviewIndex >= 0 && dropPreviewIndex == index ? styles.dropPreview : '',
                    ].join(' ')}
                    style={moveStartIndex > index ? { marginTop: '-2.4rem' } : { marginBottom: '-2.4rem' }}
                    onDragOver={e => {
                        e.preventDefault() // without this, the onDrop hook isn't called
                        onDropPreviewSelect(index)
                    }}
                    onDragLeave={() => onDropPreviewSelect(-1)}
                    onDrop={onClickOrDrop}
                    onClick={onClickOrDrop}
                >
                    <TargetIcon />
                </PlainButton>
            )}

            <div className={styles.searchBoxInput}>
                <AddressInput
                    moveStartIndex={moveStartIndex}
                    dropPreviewIndex={dropPreviewIndex}
                    index={index}
                    point={point}
                    onCancel={() => console.log('cancel')}
                    onAddressSelected={(queryText, coordinate) => {
                        const initCount = points.filter(p => p.isInitialized).length
                        if (coordinate && initCount == 0) Dispatcher.dispatch(new SetBBox(getBBoxFromCoord(coordinate)))

                        Dispatcher.dispatch(
                            new SetPoint(
                                {
                                    ...point,
                                    isInitialized: !!coordinate,
                                    queryText: queryText,
                                    coordinate: coordinate ? coordinate : point.coordinate,
                                },
                                initCount > 0
                            )
                        )
                    }}
                    clearDragDrop={() => {
                        onMoveStartSelect(-1, true)
                        onDropPreviewSelect(-1)
                    }}
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
