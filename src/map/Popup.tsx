import React from 'react'
import { coordinateToText } from '@/Converters'
import styles from './Popup.module.css'
import { Coordinate, QueryPoint, QueryPointType } from '@/stores/QueryStore'
import Dispatcher from '@/stores/Dispatcher'
import { AddPoint, QueryOSM, SetPoint, ZoomMapToPoint } from '@/actions/Actions'
import { RouteStoreState } from '@/stores/RouteStore'
import { findNextWayPoint } from '@/map/findNextWayPoint'
import Cross from '@/sidebar/times-solid.svg'

export function PopupComponent({
    coordinate,
    queryPoints,
    route,
    onSelect,
}: {
    coordinate: Coordinate
    queryPoints: QueryPoint[]
    route: RouteStoreState
    onSelect: () => void
}) {
    const dispatchSetPoint = function (point: QueryPoint, coordinate: Coordinate) {
        onSelect()
        Dispatcher.dispatch(
            new SetPoint(
                {
                    ...point,
                    coordinate: coordinate,
                    queryText: coordinateToText(coordinate),
                    isInitialized: true,
                },
                true
            )
        )
    }

    const setViaPoint = function (points: QueryPoint[], route: RouteStoreState) {
        const viaPoints = points.filter(point => point.type === QueryPointType.Via)
        const point = viaPoints.find(point => !point.isInitialized)
        onSelect()

        if (point) {
            dispatchSetPoint(point, coordinate)
        } else {
            const routes = route.routingResult.paths.map(p => {
                return {
                    coordinates: p.points.coordinates.map(pos => {
                        return { lat: pos[1], lng: pos[0] }
                    }),
                    wayPoints: p.snapped_waypoints.coordinates.map(pos => {
                        return { lat: pos[1], lng: pos[0] }
                    }),
                }
            })
            // note that we can use the index returned by findNextWayPoint no matter which route alternative was found
            // to be closest to the clicked location, because for every route the n-th snapped_waypoint corresponds to
            // the n-th query point
            const index = findNextWayPoint(routes, coordinate).nextWayPoint
            Dispatcher.dispatch(new AddPoint(index, coordinate, true))
        }
    }

    const disableViaPoint = function (points: QueryPoint[]) {
        const viaPoints = points.filter(point => point.type === QueryPointType.Via)
        if (viaPoints.length !== 0) {
            return viaPoints.every(point => !point.isInitialized)
        } else {
            return false
        }
    }

    return (
        <div className={styles.wrapper}>
            <button
                className={styles.closeBtn}
                onClick={() => {
                    onSelect()
                }}
            >
                <Cross />
            </button>
            <button className={styles.entry} onClick={() => dispatchSetPoint(queryPoints[0], coordinate)}>
                From here
            </button>
            <button
                className={styles.entry}
                disabled={disableViaPoint(queryPoints)}
                onClick={() => setViaPoint(queryPoints, route)}
            >
                Via here
            </button>
            <button
                className={styles.entry}
                onClick={() => dispatchSetPoint(queryPoints[queryPoints.length - 1], coordinate)}
            >
                To here
            </button>
            <hr />
            <button
                className={styles.entry}
                onClick={() => {
                    onSelect()
                    Dispatcher.dispatch(new ZoomMapToPoint(coordinate, 8))
                }}
            >
                Center map
            </button>
            <button
                className={styles.entry}
                onClick={() => {
                    onSelect()
                    Dispatcher.dispatch(new QueryOSM(coordinate))
                }}
            >
                Query OSM
            </button>
        </div>
    )
}
