import React from 'react'
import Mapbox from "@/Mapbox";

import {LineString} from "@/routing/Api";
import Dispatcher from "@/stores/Dispatcher";
import {AddPoint} from "@/stores/QueryStore";

const styles = require('./MapComponent.css') as any

export interface MapProps {
    readonly route: LineString,
    readonly points: [number, number][]
    readonly bbox: [number, number, number, number]
}

export class MapComponent extends React.Component<MapProps> {

    private mapContainer: React.RefObject<HTMLDivElement>
    private map!: Mapbox

    constructor(props: MapProps) {
        super(props)
        this.mapContainer = React.createRef<HTMLDivElement>()
    }

    public async componentDidMount() {

        if (!this.mapContainer.current) throw new Error('map div was not set!')

        this.map = new Mapbox(this.mapContainer.current, coordinate => Dispatcher.dispatch(new AddPoint(coordinate)))

        this.setMapSizeAfterTimeout(50)
    }

    public componentDidUpdate(prevProps: Readonly<MapProps>, prevState: Readonly<{}>, snapshot?: any) {

        if (!this.isMapReady()) return; // map is not ready yet

        if (MapComponent.shouldFitToExtent(this.props.bbox))
            this.map.fitToExtent(this.props.bbox)

        this.map.updateRoute(this.props.route)
        this.map.updatePoints(this.props.points)
    }

    public render() {
        return (
            <div className={styles.map} ref={this.mapContainer}/>
        )
    }

    private setMapSizeAfterTimeout(timeout: number) {
        setTimeout(() => {
            if (this.isMapReady()) {
                this.map.updateSize()
            } else {
                this.setMapSizeAfterTimeout(timeout * 2)
            }
        }, timeout)
    }

    private isMapReady() {
        return this.mapContainer.current && this.mapContainer.current.clientHeight > 0
    }

    private static shouldFitToExtent(bbox: [number, number, number, number]) {
        return bbox.every(num => num !== 0)
    }
}