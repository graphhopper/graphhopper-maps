import React from 'react'
import styles from '@/layers/MapFeaturePopup.module.css'
import MapPopup from '@/layers/MapPopup'
import { Map } from 'ol'
import { POIsStoreState } from '@/stores/POIsStore'
import { tr } from '@/translation/Translation'
import Dispatcher from '@/stores/Dispatcher'
import {SelectPOI, SetPoint, SetPOIs} from '@/actions/Actions'
import PlainButton from '@/PlainButton'

interface POIStatePopupProps {
    map: Map
    poiState: POIsStoreState
}

/**
 * The popup shown when certain map features are hovered. For example a road of the routing graph layer.
 */
export default function POIStatePopup({ map, poiState }: POIStatePopupProps) {
    const selectedPOI = poiState.selected
    const oldQueryPoint = poiState.oldQueryPoint

    return (
        <MapPopup map={map} coordinate={selectedPOI ? selectedPOI.coordinate : null}>
            <div className={styles.poiPopup}>
                <div>{selectedPOI?.name}</div>
                <div>{selectedPOI?.address}</div>
                <PlainButton
                    onClick={() => {
                        if (selectedPOI && oldQueryPoint) {
                            // TODO NOW how to use the POI as either start or destination?
                            //  Might be too unintuitive if it relies on with which input we searched the POIs
                            const queryPoint = {
                                ...oldQueryPoint,
                                queryText: selectedPOI?.name,
                                coordinate: selectedPOI?.coordinate,
                                isInitialized: true,
                            }
                            Dispatcher.dispatch(new SetPoint(queryPoint, false))
                            Dispatcher.dispatch(new SelectPOI(null))
                            Dispatcher.dispatch(new SetPOIs([], null))
                        }
                    }}
                >
                    {tr('Use in route')}
                </PlainButton>
            </div>
        </MapPopup>
    )
}
