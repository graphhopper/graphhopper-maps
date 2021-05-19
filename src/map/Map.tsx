import { QueryPoint } from '@/stores/QueryStore'
import React, { useEffect, useRef, useState } from 'react'
import styles from '@/map/Map.module.css'
import Mapbox from '@/map/Mapbox'
import Dispatcher from '@/stores/Dispatcher'
import { MapIsLoaded } from '@/actions/Actions'
import { Bbox, Path } from '@/api/graphhopper'
import { StyleOption } from '@/stores/MapOptionsStore'

type MapProps = {
    selectedPath: Path
    paths: Path[]
    queryPoints: QueryPoint[]
    bbox: Bbox
    mapStyle: StyleOption
}

export default function({ selectedPath, paths, queryPoints, bbox, mapStyle }: MapProps) {
    const mapContainerRef: React.RefObject<HTMLDivElement> = useRef(null)
    const [map, setMap] = useState<Mapbox | null>(null)
    // we need to keep track of the latest bbox so it is available in the onMapReady callback by the time the Mapbox
    // instance is loaded
    const prevBbox = useRef<Bbox>()
    useEffect(() => {
        prevBbox.current = bbox
    }, [bbox])

    useEffect(() => {
        // as long as we re-create the Mapbox instance when changing the mapStyle we need to make sure the viewport
        // state is preserved
        const prevViewPort = map?.getViewPort()
        if (map) map.remove()

        const mapWrapper = new Mapbox(
            mapContainerRef.current!,
            mapStyle,
            () => {
                setMap(mapWrapper)
                if (!prevViewPort)
                    mapWrapper.fitBounds(prevBbox.current!)
                Dispatcher.dispatch(new MapIsLoaded())
            }
        )
        if (prevViewPort)
            mapWrapper.setViewPort(prevViewPort)
        return () => map?.remove()
    }, [mapStyle, prevBbox])
    useEffect(() => map?.drawPaths(paths, selectedPath), [paths, selectedPath, map])
    useEffect(() => map?.showPathDetails(selectedPath), [selectedPath, map])
    useEffect(() => map?.drawMarkers(queryPoints), [queryPoints, map])
    // no dependency on map here, because in case changed the viewport manually we do not want to go back to the bbox
    // after a style change onMapReady
    useEffect(() => map?.fitBounds(bbox), [bbox])

    return <div className={styles.map} ref={mapContainerRef} />
}
