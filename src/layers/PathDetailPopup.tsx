import { Map, Overlay } from 'ol'
import React, { useEffect, useRef, useState } from 'react'
import styles from '@/layers/PathDetailPopup.module.css'
import { fromLonLat } from 'ol/proj'
import { metersToText } from '@/Converters'
import { useStore } from '@/stores/useStore'

interface PathDetailPopupProps {
    map: Map
}

/**
 * The popup shown along the selected route when we hover the path detail/elevation graph
 */
export default function PathDetailPopup({ map }: PathDetailPopupProps) {
    const pathDetailsPoint = useStore(store => store.pathDetailsPoint)
    const [overlay, setOverlay] = useState<Overlay | undefined>()
    const container = useRef<HTMLDivElement | null>()

    useEffect(() => {
        const overlay = new Overlay({
            element: container.current!,
            autoPan: false,
        })
        setOverlay(overlay)
        map.addOverlay(overlay)
    }, [map])

    useEffect(() => {
        const position = pathDetailsPoint
            ? fromLonLat([pathDetailsPoint.point.lng, pathDetailsPoint.point.lat])
            : undefined
        overlay?.setPosition(position)
    }, [pathDetailsPoint])

    const showDistanceInMiles = useStore(store => store.showDistanceInMiles)

    return (
        // todo: use createMapMarker from heightgraph?
        // {createMapMarker(point.elevation, point.description, showDistanceInMiles)}
        <div className={styles.popup} ref={container as any}>
            {pathDetailsPoint && (
                <p>
                    {metersToText(Math.round(pathDetailsPoint.elevation), showDistanceInMiles, true)}
                    <br />
                    {pathDetailsPoint!.description}
                </p>
            )}
        </div>
    )
}
