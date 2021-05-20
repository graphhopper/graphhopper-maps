import { QueryPoint, Coordinate } from '@/stores/QueryStore'
import React, { useEffect, useRef, useState } from 'react'
import styles from '@/map/Map.module.css'
import Mapbox from '@/map/Mapbox'
import Dispatcher from '@/stores/Dispatcher'
import { MapIsLoaded } from '@/actions/Actions'
import { Bbox, Path } from '@/api/graphhopper'
import { StyleOption } from '@/stores/MapOptionsStore'
import { LocationStoreState } from '@/stores/LocationStore'
import { useMediaQuery } from 'react-responsive'

type MapProps = {
    selectedPath: Path
    paths: Path[]
    queryPoints: QueryPoint[]
    bbox: Bbox
    mapStyle: StyleOption
    location?: LocationStoreState
}

export default function ({ selectedPath, paths, queryPoints, bbox, mapStyle, location }: MapProps) {
    const mapContainerRef: React.RefObject<HTMLDivElement> = useRef(null)
    const [map, setMap] = useState<Mapbox | null>(null)
    const isSmallScreen = useMediaQuery({ query: '(max-width: 44rem)' })

    useEffect(() => {
        if (map) map.remove()

        const mapWrapper = new Mapbox(mapContainerRef.current!, mapStyle, () => {
            setMap(mapWrapper)
            Dispatcher.dispatch(new MapIsLoaded())
        })
        mapWrapper.fitBounds(bbox)
        return () => map?.remove()
    }, [mapStyle])
    useEffect(() => map?.drawPaths(paths, selectedPath), [paths, selectedPath, map])
    useEffect(() => map?.showPathDetails(selectedPath, isSmallScreen), [selectedPath, isSmallScreen, map])
    useEffect(() => map?.drawMarkers(queryPoints), [queryPoints, map])
    useEffect(() => map?.fitBounds(bbox), [bbox, map])
    useEffect(() => map?.showCurrentLocation(location), [location, map])
    useEffect(() => map?.resize())

    return <div className={styles.map} ref={mapContainerRef} />
}
