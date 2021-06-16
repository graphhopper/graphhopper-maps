import { Popup } from 'react-map-gl'
import { PopupComponent } from '@/map/Popup'
import React from 'react'
import { Coordinate, QueryPoint } from '@/stores/QueryStore'

interface ContextMenuLayerProps {
    queryPoints: QueryPoint[]
    popupCoordinate: Coordinate | null
    setPopupCoordinate: (c: Coordinate | null) => void
}

export default function ({ queryPoints, popupCoordinate, setPopupCoordinate }: ContextMenuLayerProps) {
    return (
        <>
            {popupCoordinate && (
                <Popup
                    longitude={popupCoordinate.lng}
                    latitude={popupCoordinate.lat}
                    closeOnClick={true}
                    closeButton={false}
                >
                    <PopupComponent
                        coordinate={popupCoordinate}
                        queryPoints={queryPoints}
                        onSelect={() => setPopupCoordinate(null)}
                    />
                </Popup>
            )}
        </>
    )
}
