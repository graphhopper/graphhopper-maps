import React from 'react'
import Mapbox from "@/Mapbox";

import {InfoResult, RoutingArgs} from "@/routing/Api";
import Dispatcher from "@/stores/Dispatcher";
import {AddPoint} from "@/stores/QueryStore";
import {getApiInfoStore, getQueryStore, getRouteStore} from "@/stores/Stores";
import {RouteStoreState} from "@/stores/RouteStore";

const styles = require('./MapComponent.css') as any

interface MapState {
    query: RoutingArgs
    routeState: RouteStoreState
    infoState: InfoResult
}

export class MapComponent extends React.Component<{}, MapState> {

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
        this.state = {
            query: this.queryStore.state.routingArgs,
            routeState: this.routeStore.state,
            infoState: this.infoStore.state
        }
    }

    public async componentDidMount() {

        if (!this.mapContainer.current) throw new Error('map div was not set!')

        this.map = new Mapbox(
            this.mapContainer.current,
            coordinate => Dispatcher.dispatch(new AddPoint(coordinate)),
            () => {
                // in case we get a query from a url display it on the map as soon as it is ready
                this.map.updatePoints(this.state.query.points)
                this.map.updateRoute(this.state.routeState.selectedPath.points)
                if (MapComponent.shouldFitToExtent(this.state.routeState.selectedPath.bbox))
                    this.map.fitToExtent(this.state.routeState.selectedPath.bbox)
            }
        )

        if (MapComponent.shouldFitToExtent(this.state.infoState.bbox)) {
            console.info("setting to info bbox on didmount: " + JSON.stringify(this.state.infoState.bbox))
            this.map.fitToExtent(this.state.infoState.bbox)
        }

        this.setMapSizeAfterTimeout(50)
    }

    private onQueryChanged() {

        this.setState({query: this.queryStore.state.routingArgs})
        this.map.updatePoints(this.state.query.points)
    }

    private onRouteChanged() {

        this.setState({routeState: this.routeStore.state})
        this.map.updateRoute(this.state.routeState.selectedPath.points)

        if (MapComponent.shouldFitToExtent(this.state.routeState.selectedPath.bbox))
            this.map.fitToExtent(this.state.routeState.selectedPath.bbox)
    }

    private onInfoChanged() {
        this.setState({infoState: this.infoStore.state})

        if (MapComponent.shouldFitToExtent(this.state.infoState.bbox))
            this.map.fitToExtent(this.state.infoState.bbox)
    }

    public render() {
        return (
            <div className={styles.map} ref={this.mapContainer}/>
        )
    }

    private setMapSizeAfterTimeout(timeout: number) {
        setTimeout(() => {
            if (this.isLayoutReady()) {
                this.map.updateSize()
                if (MapComponent.shouldFitToExtent(this.state.infoState.bbox)) {
                    this.map.fitToExtent(this.state.infoState.bbox)
                }
            } else {
                this.setMapSizeAfterTimeout(timeout * 2)
            }
        }, timeout)
    }

    private isLayoutReady() {
        return this.mapContainer.current && this.mapContainer.current.clientHeight > 0
    }

    private static shouldFitToExtent(bbox: [number, number, number, number]) {
        return bbox.every(num => num !== 0)
    }
}