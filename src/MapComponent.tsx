import React from 'react'
import Mapbox from "@/Mapbox";

import {LineString} from "@/routing/Api";

const styles = require('./MapComponent.css') as any

export interface MapProps {
    points: LineString
    bbox: [number, number, number, number]
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

        this.map = new Mapbox(this.mapContainer.current)

        this.setMapSizeAfterTimeout(50)
    }

    public componentDidUpdate(prevProps: Readonly<MapProps>, prevState: Readonly<{}>, snapshot?: any) {

        if (!this.isMapReady()) return; // map is not ready yet

        // zoom to bounding box
        this.map.fitToExtent(this.props.bbox)

        if (this.props.points.coordinates.length > 0) {
            // draw a path
            this.map.updateGeometry(this.props.points)
        }
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


}