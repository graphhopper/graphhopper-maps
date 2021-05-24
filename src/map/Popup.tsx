import React from 'react'
import { coordinateToText } from '@/Converters'
import styles from './Popup.module.css'
import { Coordinate, QueryPoint, QueryPointType } from '@/stores/QueryStore'
import Dispatcher from '@/stores/Dispatcher'
import { AddPoint, SetPoint } from '@/actions/Actions'

export function PopupComponent({ coordinate, queryPoints, onSelect }: {
    coordinate: Coordinate
    queryPoints: QueryPoint[]
    onSelect: () => void
}) {
    const dispatchSetPoint = function(point: QueryPoint, coordinate: Coordinate) {
        onSelect()
        Dispatcher.dispatch(
            new SetPoint({
                ...point,
                coordinate: coordinate,
                queryText: coordinateToText(coordinate),
                isInitialized: true
            })
        )
    }

    const setViaPoint = function(points: QueryPoint[]) {
        const viaPoints = points.filter(point => point.type === QueryPointType.Via)
        const point = viaPoints.find(point => !point.isInitialized)
        onSelect()

        if (point) {
            dispatchSetPoint(point, coordinate)
        } else {
            Dispatcher.dispatch(new AddPoint(viaPoints.length + 1, coordinate, true))
        }
    }

    const disableViaPoint = function(points: QueryPoint[]) {
        return (
            points.length >= 5 &&
            points.filter(point => point.type === QueryPointType.Via).every(point => point.isInitialized)
        )
    }

    return (
        <div className={styles.wrapper}>
            <button className={styles.entry} onClick={() => dispatchSetPoint(queryPoints[0], coordinate)}>
                From here
            </button>
            <button
                className={styles.entry}
                disabled={disableViaPoint(queryPoints)}
                onClick={() => setViaPoint(queryPoints)}
            >
                Via here
            </button>
            <button
                className={styles.entry}
                onClick={() => dispatchSetPoint(queryPoints[queryPoints.length - 1], coordinate)}
            >
                To here
            </button>
            <button className={styles.entry} disabled={true}>
                Center map
            </button>
        </div>
    )
}
