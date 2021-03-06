import React from 'react'

import ReactDOM from 'react-dom'
import styles from './Popup.module.css'
import { Coordinate, QueryPoint } from '@/stores/QueryStore'
import Dispatcher from '@/stores/Dispatcher'
import { AddPoint, SetPoint } from '@/actions/Actions'

export default function createPopup(coordinate: Coordinate, queryPoints: QueryPoint[]) {
    const container = document.createElement('div')
    ReactDOM.render(<Popup coordinate={coordinate} queryPoints={queryPoints} />, container)
    return container
}

function Popup({ coordinate, queryPoints }: { coordinate: Coordinate; queryPoints: QueryPoint[] }) {
    const dispatch = function (point: QueryPoint) {
        Dispatcher.dispatch(new SetPoint(point.id, coordinate, point.queryText))
    }
    return (
        <div className={styles.wrapper}>
            <button onClick={() => dispatch(queryPoints[0])}>From here</button>
            <button onClick={() => Dispatcher.dispatch(new AddPoint(queryPoints.length - 1, coordinate, true))}>
                Via here
            </button>
            <button onClick={() => dispatch(queryPoints[queryPoints.length - 1])}>To here</button>
            <button>Center map</button>
        </div>
    )
}
