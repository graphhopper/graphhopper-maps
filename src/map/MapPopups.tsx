import { Map } from 'ol'
import PathDetailPopup from '@/layers/PathDetailPopup'
import MapFeaturePopup from '@/layers/MapFeaturePopup'
import InstructionPopup from '@/layers/InstructionPopup'
import React from 'react'
import { PathDetailsStoreState } from '@/stores/PathDetailsStore'
import { MapFeatureStoreState } from '@/stores/MapFeatureStore'
import { POI, POIsStoreState } from '@/stores/POIsStore'
import POIStatePopup from '@/layers/POIPopup'
import {QueryStoreState} from "@/stores/QueryStore";

interface MapPopupProps {
    map: Map
    pathDetails: PathDetailsStoreState
    mapFeatures: MapFeatureStoreState
    poiState: POIsStoreState
    query: QueryStoreState
}

export default function MapPopups({ map, pathDetails, mapFeatures, poiState, query }: MapPopupProps) {
    return (
        <>
            <PathDetailPopup map={map} pathDetails={pathDetails} />
            <MapFeaturePopup
                map={map}
                properties={mapFeatures.roadAttributes}
                coordinate={mapFeatures.roadAttributesCoordinate}
            />
            <InstructionPopup
                map={map}
                instructionText={mapFeatures.instructionText}
                coordinate={mapFeatures.instructionCoordinate}
            />
            <POIStatePopup map={map} poiState={poiState} points={query.queryPoints} />
        </>
    )
}
