import 'ol/ol.css'
import styles from '@/map/Map.module.css'
import { useEffect, useRef } from 'react'
import { Map } from 'ol'

type MapComponentProps = {
    map: Map
}

/** A small react component that simply attaches our map instance to a div to show the map **/
export default function ({ map }: MapComponentProps) {
    const mapElement = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        map.setTarget(mapElement.current!)
    }, [map])
    return <div ref={mapElement} className={styles.mapContainer} />
}
