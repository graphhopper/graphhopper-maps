import React from 'react'

import ReactDOM from 'react-dom'
import styles from './Popup.module.css'
import mapboxgl from 'mapbox-gl'
import { QueryPoint, QueryPointType, Coordinate } from '@/stores/QueryStore'
import Dispatcher from '@/stores/Dispatcher'
import { AddPoint, SetPoint } from '@/actions/Actions'
import { getQueryStore } from '@/stores/Stores'

/**
 * Class to bridge the gap between mapboxgl and reactjs. The popup is rendered by the map which lives outside of the react
 * context. This class holds a container html element which is managed by the mapbox map. Inside the container a new dom
 * tree is rendered by reactjs
 */
export class Popup {
    private readonly map: mapboxgl.Map
    private readonly popup = new mapboxgl.Popup({
        closeOnMove: true,
        closeOnClick: true,
        closeButton: false,
    })
    private readonly queryStore = getQueryStore()
    private readonly container = document.createElement('div')

    constructor(map: mapboxgl.Map) {
        this.map = map
    }

    show(coordinate: mapboxgl.LngLat) {
        ReactDOM.render(
            <PopupComponent
                coordinate={coordinate}
                queryPoints={this.queryStore.state.queryPoints}
                onSelect={() => this.hide()}
            />,
            this.container
        )

        this.popup.setLngLat(coordinate).setDOMContent(this.container).addTo(this.map)
    }

    hide() {
        this.popup.remove()
    }
}

function PopupComponent({
    coordinate,
    queryPoints,
    onSelect,
}: {
    coordinate: mapboxgl.LngLat
    queryPoints: QueryPoint[]
    onSelect: () => void
}) {
    const dispatchSetPoint = function (point: QueryPoint, mCoordinate: mapboxgl.LngLat) {
        onSelect()
        const coordinate = new Coordinate(mCoordinate.lat, mCoordinate.lng);
        Dispatcher.dispatch(
            new SetPoint({
                ...point,
                coordinate: coordinate,
                queryText: coordinate.getQueryText(),
                isInitialized: true,
            })
        )
    }

    const setViaPoint = function (points: QueryPoint[]) {
        const viaPoints = points.filter(point => point.type === QueryPointType.Via)
        const point = viaPoints.find(point => !point.isInitialized)
        onSelect()

        if (point) {
            dispatchSetPoint(point, coordinate)
        } else {
            Dispatcher.dispatch(new AddPoint(viaPoints.length + 1, new Coordinate(coordinate.lat, coordinate.lng), true))
        }
    }

    const disableViaPoint = function (points: QueryPoint[]) {
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
