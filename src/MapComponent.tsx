import React from 'react'
import Openlayers from "@/Openlayers";

const styles = require('./MapComponent.css') as any

export interface MapProps {
}

export class MapComponent extends React.Component<MapProps> {

    private mapContainer: React.RefObject<HTMLDivElement>
    private map!: Openlayers

    constructor(props: MapProps) {
        super(props)
        this.mapContainer = React.createRef<HTMLDivElement>()
    }

    public async componentDidMount() {

        if (!this.mapContainer.current) throw new Error('map div was not set!')

        this.map = new Openlayers(this.mapContainer.current)

        this.setMapSizeAfterTimeout(500)
    }

    public render() {
        return (
            <div className={styles.map} ref={this.mapContainer}/>
        )
    }

    private setMapSizeAfterTimeout(timeout: number) {
        setTimeout(() => {
            if (this.mapContainer.current && this.mapContainer.current.clientHeight > 0) {
                this.map.updateSize()
            } else {
                this.setMapSizeAfterTimeout(timeout * 2)
            }
        }, timeout)
    }
}