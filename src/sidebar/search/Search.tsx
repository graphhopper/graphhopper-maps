import React, {useState} from 'react'
import Dispatcher from '@/stores/Dispatcher'
import styles from '@/sidebar/search/Search.module.css'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { AddPoint, ClearRoute, InvalidatePoint, RemovePoint, SetPoint, SwapPoints } from '@/actions/Actions'
import RoutingProfiles from '@/sidebar/search/routingProfiles/RoutingProfiles'
import RemoveIcon from './minus-circle-solid.svg'
import AddIcon from './plus-circle-solid.svg'
import MoveIcon from './arrow-upward.svg'
import PlainButton from '@/PlainButton'
import { RoutingProfile } from '@/api/graphhopper'

import AddressInput from '@/sidebar/search/AddressInput'
import { MarkerComponent } from '@/map/Marker'
import { tr } from '@/translation/Translation'
import {transform} from "ol/proj";

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
            <RoutingProfiles routingProfiles={routingProfiles} selectedProfile={selectedProfile}/>
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
                />
            ))}
            <PlainButton
                onClick={() => Dispatcher.dispatch(new AddPoint(points.length, {lat: 0, lng: 0}, false))}
                className={styles.addSearchBox}
            >
                <AddIcon/>
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
}: {
    index: number
    points: QueryPoint[]
    deletable: boolean
    onChange: (value: string) => void
    autofocus: boolean
}) => {
    let [showMoveIcons, setShowMoveIcons] = useState(false)
    let point = points[index]

    // TODO simpler to implement than DnD and simpler on mobile (and when dragging a longer distance) when we instead do:
    //  first click on marker icon
    //    -> selects input that should be moved (another click on the same input will abort the move)
    //    -> at the same time plus signs between the inputs will appear and the marker icons will disappear
    //  second click on one of those appeared signs
    //    -> move the input to this index and marker icons will appear again

    return (
        <>
            {
                showMoveIcons ?
                    (<div>
                        {index != 0 &&
                            <PlainButton onClick={() => {
                                Dispatcher.dispatch(new SwapPoints(point, points[index - 1]));
                                setShowMoveIcons(false);
                            }}><MoveIcon color={point.color}/></PlainButton>
                        }
                        {index + 1 < points.length &&
                            <PlainButton style={{transform: "rotate(180deg)"}} onClick={() => {
                                Dispatcher.dispatch(new SwapPoints(point, points[index + 1]));
                                setShowMoveIcons(false);
                            }}><MoveIcon color={point.color}/></PlainButton>
                        }
                    </div>)
                    :
                    <div className={styles.markerContainer} onClick={() => setShowMoveIcons(true)}>
                        <MarkerComponent color={point.color}/>
                    </div>
            }
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
                    <RemoveIcon/>
                </PlainButton>
            )}
        </>
    )
}
