import { Map, Overlay } from 'ol'
import React, { useEffect, useRef, useState } from 'react'
import styles from '@/layers/PathDetailPopup.module.css'
import { PathDetailsStoreState } from '@/stores/PathDetailsStore'
import { fromLonLat } from 'ol/proj'

interface PathDetailPopupProps {
    map: Map
    pathDetails: PathDetailsStoreState
}

/**
 * The popup shown along the selected route when we hover the path detail/elevation graph
 */
export default function PathDetailPopup({ map, pathDetails }: PathDetailPopupProps) {
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
        const position = pathDetails.pathDetailsPoint
            ? fromLonLat([pathDetails.pathDetailsPoint.point.lng, pathDetails.pathDetailsPoint.point.lat])
            : undefined
        overlay?.setPosition(position)
    }, [pathDetails.pathDetailsPoint])

    return (
        // todo: use createMapMarker from heightgraph?
        // {createMapMarker(point.elevation, point.description)}
        <div className={styles.popup} ref={container as any}>
            {pathDetails.pathDetailsPoint && (
                <p>
                    elevation: {pathDetails.pathDetailsPoint.elevation}
                    <br />
                    {pathDetails.pathDetailsPoint!.description}
                </p>
            )}
        </div>
    )
}
