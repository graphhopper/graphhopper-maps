import { Map, Overlay } from 'ol'
import { useEffect, useRef, useState } from 'react'
import { fromLonLat } from 'ol/proj'
import { Coordinate } from '@/stores/QueryStore'

interface MapPopupProps {
    map: Map
    coordinate: Coordinate | null
    children: JSX.Element
}

export default function MapPopup({ map, coordinate, children }: MapPopupProps) {
    const [overlay, setOverlay] = useState<Overlay | undefined>()
    const container = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const overlay = new Overlay({
            element: container.current!,
            autoPan: false,
        })
        setOverlay(overlay)
        map.addOverlay(overlay)
    }, [map])

    useEffect(() => {
        overlay?.setPosition(coordinate ? fromLonLat([coordinate.lng, coordinate.lat]) : undefined)
    }, [coordinate])

    return <div ref={container}>{children}</div>
}
