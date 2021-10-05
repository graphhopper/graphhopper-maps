import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { Marker } from 'react-map-gl'
import Dispatcher from '@/stores/Dispatcher'
import { SetPoint } from '@/actions/Actions'
import { coordinateToText } from '@/Converters'
import { MarkerComponent } from '@/map/Marker'
import React from 'react'
import { MapLayer } from '@/layers/MapLayer'

export default function (queryPoints: QueryPoint[]): MapLayer {
    return {
        interactiveLayerIds: [],
        onClick: () => {},
        layer: <>{...createQueryPointMarkers(queryPoints)}</>,
    }
}

function createQueryPointMarkers(queryPoints: QueryPoint[]) {
    return queryPoints
        .map((point, i) => {
            return { index: i, point: point }
        })
        .filter(indexPoint => indexPoint.point.isInitialized)
        .map((indexPoint, i) => (
            <Marker
                key={i}
                longitude={indexPoint.point.coordinate.lng}
                latitude={indexPoint.point.coordinate.lat}
                draggable={true}
                onDragEnd={(e: any) => {
                    const coordinate = { lng: e.lngLat[0], lat: e.lngLat[1] }
                    Dispatcher.dispatch(
                        new SetPoint({
                            ...indexPoint.point,
                            coordinate,
                            queryText: coordinateToText(coordinate),
                        })
                    )
                }}
            >
                <MarkerComponent
                    color={indexPoint.point.color}
                    number={indexPoint.point.type === QueryPointType.Via ? i : undefined}
                    size={40}
                />
            </Marker>
        ))
}
