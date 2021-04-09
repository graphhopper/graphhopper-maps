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
    const queryPointsRef = useRef(queryPoints)
    const [map, setMap] = useState<Mapbox | null>(null)

    // use this to be able to use querypoints props in onClick callback of the map
    // see https://reactjs.org/docs/hooks-faq.html#what-can-i-do-if-my-effect-dependencies-change-too-often
    useEffect(() => {
        queryPointsRef.current = queryPoints
    })

    useEffect(() => {
        if (map) map.remove()

        const mapWrapper = new Mapbox(
            mapContainerRef.current!,
            mapStyle,
            () => {
                setMap(mapWrapper)
                Dispatcher.dispatch(new MapIsLoaded())
            },
            e => {
                let point = queryPointsRef.current.find(point => !point.isInitialized)
                if (!point) {
                    point = queryPointsRef.current[0]
                    Dispatcher.dispatch(new ClearPoints())
                }
                Dispatcher.dispatch(
                    new SetPoint({
                        ...point,
                        isInitialized: true,
                        coordinate: e.lngLat,
                        queryText: e.lngLat.lng + ', ' + e.lngLat.lat,
                    })
                )
            }
        )
        mapWrapper.fitBounds(bbox)
        return () => map?.remove()
    }, [mapStyle])
    useEffect(() => map?.drawPaths(paths, selectedPath), [paths, selectedPath, map])
    useEffect(() => map?.showPathDetails(selectedPath), [selectedPath, map])
    useEffect(() => map?.drawMarkers(queryPoints), [queryPoints, map])
    useEffect(() => map?.fitBounds(bbox), [bbox, map])

    return <div className={styles.map} ref={mapContainerRef} />
}
