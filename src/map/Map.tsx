import { QueryPoint } from '@/stores/QueryStore'
import React, { useEffect, useRef, useState } from 'react'
import styles from '@/map/Map.module.css'
import Mapbox, { ViewPort } from '@/map/Mapbox'
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
    const prevViewPort = useRef<ViewPort | null>(null)
    prevViewPort.current = null

    useEffect(() => {
        if (map) {
            map.remove()
            // save the current view port so we can set it after re-creating the Mapbox instance when we change mapStyle
            prevViewPort.current = map.getViewPort()
        }

        const mapWrapper = new Mapbox(
            mapContainerRef.current!,
            mapStyle,
            () => {
                setMap(mapWrapper)
                Dispatcher.dispatch(new MapIsLoaded())
            }
        )
        if (prevViewPort.current)
            mapWrapper.setViewPort(prevViewPort.current)
        return () => map?.remove()
    }, [mapStyle])
    useEffect(() => map?.drawPaths(paths, selectedPath), [paths, selectedPath, map])
    useEffect(() => map?.showPathDetails(selectedPath), [selectedPath, map])
    useEffect(() => map?.drawMarkers(queryPoints), [queryPoints, map])
    useEffect(() => {
        // previous view port takes precedence if it was set. for example when we just changed the mapStyle we do
        // not want to go back to the bbox
        if (prevViewPort.current)
            map?.setViewPort(prevViewPort.current)
        else
            map?.fitBounds(bbox)
    }, [bbox, map, prevViewPort])

    return <div className={styles.map} ref={mapContainerRef} />
}
