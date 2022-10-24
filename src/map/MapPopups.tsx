import { Map } from 'ol'
import PathDetailPopup from '@/layers/PathDetailPopup'
import MapFeaturePopup from '@/layers/MapFeaturePopup'
import InstructionPopup from '@/layers/InstructionPopup'
import React from 'react'
import { PathDetailsStoreState } from '@/stores/PathDetailsStore'
import { MapFeatureStoreState } from '@/stores/MapFeatureStore'

interface MapPopupProps {
    map: Map
    pathDetails: PathDetailsStoreState
    mapFeatures: MapFeatureStoreState
}

export default function MapPopups({ map, pathDetails, mapFeatures }: MapPopupProps) {
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
        </>
    )
}
