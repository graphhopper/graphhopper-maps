import { QueryPoint } from '@/stores/QueryStore'
import React, { useEffect, useRef, useState } from 'react'
import styles from '@/map/Map.module.css'
import Mapbox from '@/map/Mapbox'
import Dispatcher from '@/stores/Dispatcher'
import { ClearPoints, MapIsLoaded, SetPoint } from '@/actions/Actions'
import { Bbox, Path } from '@/api/graphhopper'
import { StyleOption } from '@/stores/MapOptionsStore'

type MapProps = {
    selectedPath: Path
    paths: Path[]
    queryPoints: QueryPoint[]
    bbox: Bbox
    mapStyle: StyleOption
}

export default function ({ selectedPath, paths, queryPoints, bbox, mapStyle }: MapProps) {
    const mapContainerRef: React.RefObject<HTMLDivElement> = useRef(null)
    const [map, setMap] = useState<Mapbox | null>(null)

    useEffect(() => {
        if (map) map.remove()

        const mapWrapper = new Mapbox(
            mapContainerRef.current!,
            mapStyle,
            () => {
                setMap(mapWrapper)
                Dispatcher.dispatch(new MapIsLoaded())
            }
        )

        return () => map?.remove()
    }, [mapStyle])
    useEffect(() => map?.drawPaths(paths, selectedPath), [paths, selectedPath, map])
    useEffect(() => map?.showPathDetails(selectedPath), [selectedPath, map])
    useEffect(() => map?.drawMarkers(queryPoints), [queryPoints, map])
    useEffect(() => map?.fitBounds(bbox), [bbox, map])

    return <div className={styles.map} ref={mapContainerRef} />
}
