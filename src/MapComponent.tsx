import React from 'react'
import Mapbox from '@/Mapbox'
import Dispatcher from '@/stores/Dispatcher'
import { getApiInfoStore, getQueryStore, getRouteStore } from '@/stores/Stores'

import styles from '@/MapComponent.module.css'
import { Coordinate } from '@/stores/QueryStore'
import { ClearPoints, SetPoint } from '@/actions/Actions'

export class MapComponent extends React.Component {
    private queryStore = getQueryStore()
    private routeStore = getRouteStore()
    private infoStore = getApiInfoStore()

    private mapContainer: React.RefObject<HTMLDivElement>
    private map!: Mapbox

    constructor(props: {}) {
        super(props)
        this.mapContainer = React.createRef<HTMLDivElement>()

        this.queryStore.register(() => this.onQueryChanged())
        this.routeStore.register(() => this.onRouteChanged())
        this.infoStore.register(() => this.onInfoChanged())
    }

    public async componentDidMount() {
        if (!this.mapContainer.current) throw new Error('map div was not set!')

        this.map = new Mapbox(
            this.mapContainer.current,
            coordinate => this.setQueryPoint(coordinate),
            () => {
                // in case we get a query from a url display it on the map as soon as it is ready

                this.map.updateQueryPoints(this.queryStore.state.queryPoints)
                this.map.updateRoute(this.routeStore.state.selectedPath.points)
                this.fitToExtentIfNecessary(this.routeStore.state.selectedPath.bbox)
            }
        )

        this.fitToExtentIfNecessary(this.infoStore.state.bbox)
        this.setMapSizeAfterTimeout(50)
    }

    private onQueryChanged() {
        this.map.updateQueryPoints(this.queryStore.state.queryPoints)
    }

    private onRouteChanged() {
        this.map.updateRoute(this.routeStore.state.selectedPath.points)
        this.fitToExtentIfNecessary(this.routeStore.state.selectedPath.bbox)
    }

    public render() {
        return <div className={styles.map} ref={this.mapContainer} />
    }

    private onInfoChanged() {
        this.fitToExtentIfNecessary(this.infoStore.state.bbox)
    }

    private isLayoutReady() {
        return this.mapContainer.current && this.mapContainer.current.clientHeight > 0
    }

    private setMapSizeAfterTimeout(timeout: number) {
        setTimeout(() => {
            if (this.isLayoutReady()) {
                this.map.updateSize()
                this.fitToExtentIfNecessary(this.infoStore.state.bbox)
            } else {
                this.setMapSizeAfterTimeout(timeout * 2)
            }
        }, timeout)
    }

    private fitToExtentIfNecessary(bbox: [number, number, number, number]) {
        if (MapComponent.shouldFitToExtent(bbox)) this.map.fitToExtent(bbox)
    }

    private static shouldFitToExtent(bbox: [number, number, number, number]) {
        return bbox.every(num => num !== 0)
    }

    private setQueryPoint(coordinate: Coordinate) {
        let point = this.queryStore.state.queryPoints.find(point => !point.isInitialized)
        if (!point) {
            // clear
            Dispatcher.dispatch(new ClearPoints())
            point = this.queryStore.state.queryPoints.find(point => !point.isInitialized)
        }
        Dispatcher.dispatch(new SetPoint(point!.id, coordinate, point!.queryText))
    }
}
