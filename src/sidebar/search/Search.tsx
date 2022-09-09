import React, {useEffect, useState} from 'react'
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
    autofocus,
}: {
    points: QueryPoint[]
    routingProfiles: RoutingProfile[]
    selectedProfile: RoutingProfile
    autofocus: boolean
}) {
    points.every(point => point.isInitialized)
    const firstId = points.length > 0 ? points[0].id : undefined
    return (
        <div>
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
                    firstPoint={point.id === firstId}
                />
            ))}
            <PlainButton
                onClick={() => Dispatcher.dispatch(new AddPoint(points.length, { lat: 0, lng: 0 }, false))}
                className={styles.addSearchBox}
            >
                <AddIcon />
                <div>{tr('Add Location')}</div>
            </PlainButton>
        </div>
    )
}

const SearchBox = ({
    point,
    onChange,
    deletable,
    autofocus,
    firstPoint,
}: {
    point: QueryPoint
    deletable: boolean
    onChange: (value: string) => void
    autofocus: boolean
    firstPoint: boolean
}) => {
    const [showDragHint, setShowDragHint] = useState(false)
    const [showDragHintForFirst, setShowDragHintForFirst] = useState(false)
    const [dragging, setDragging] = useState(false)

    return (
        <>
            { firstPoint &&
                <div className={showDragHintForFirst ? styles.showDragHintForFirst : ''}
                     style={{color: 'white'}}
                    // make it dropable two preventDefault calls are required:
                     onDragEnter={(e) => e.preventDefault()}
                     onDragOver={(e) => {
                         e.preventDefault();
                         if(""+point.id !== e.dataTransfer.getData("point.id"))
                            setShowDragHintForFirst(true);
                     }}
                     onDragExit={(e) => setShowDragHintForFirst(false)}
                     onDrop={(e) => {
                         setDragging(false);
                         setShowDragHintForFirst(false);
                         console.log("drop " + point.id + " " + e.dataTransfer.getData("point.id"))
                     }}
                >
                    First
                </div>
            }
            <div className={styles.rowContainer + ' ' + (showDragHint ? styles.showDragHint : '')}
                // make it draggable:
                draggable
                onDragStart={(e) => {
                    setDragging(true);
                    e.dataTransfer.setData("point.id", ""+point.id);
                    console.log("start drag " + point.id)
                }}
                // make it dropable two preventDefault calls are required:
                onDragEnter={ (e) => e.preventDefault() }
                onDragOver={ (e) => {
                    e.preventDefault();
                    if(""+point.id !== e.dataTransfer.getData("point.id") && ""+(point.id+1) !== e.dataTransfer.getData("point.id"))
                        setShowDragHint(true);
                }}
                onDragExit={ (e) => setShowDragHint(false) }
                onDrop={ (e) => {
                    setDragging(false);
                    setShowDragHint(false);
                    console.log("drop " + point.id + " " + e.dataTransfer.getData("point.id"))
                }}
                >
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
                    title={tr('Remove Stop')}
                    onClick={() => Dispatcher.dispatch(new RemovePoint(point))}
                    className={styles.removeSearchBox}
                >
                    <RemoveIcon />
                </PlainButton>
            )}
            </div>
        </>
    )
}
