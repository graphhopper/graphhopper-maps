import { Popup } from 'react-map-gl'
import { PopupComponent } from '@/map/Popup'
import React from 'react'
import { Coordinate, QueryPoint } from '@/stores/QueryStore'
import { MapLayer } from '@/stores/MapLayerStore'

export default function (
    queryPoints: QueryPoint[],
    popupCoordinate: Coordinate | null,
    setPopupCoordinate: (c: Coordinate | null) => void
): MapLayer {
    return {
        id: 'context-menu-layer',
        interactiveLayerIds: [],
        onClick: () => {},
        layer: (
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
        ),
    }
}
