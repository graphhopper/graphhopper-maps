import { Map, Overlay } from 'ol'
import { JSX, useEffect, useRef, useState } from 'react'
import { fromLonLat } from 'ol/proj'
import { Coordinate } from '@/utils'

interface MapPopupProps {
    map: Map
    coordinate: Coordinate | null
    children: JSX.Element
}

export default function MapPopup({ map, coordinate, children }: MapPopupProps) {
    const [overlay, setOverlay] = useState<Overlay | undefined>()
    const container = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const newOverlay = new Overlay({
            element: container.current!,
            autoPan: false,
        })
        setOverlay(newOverlay)
        map.addOverlay(newOverlay)

        return () => {
            map.removeOverlay(newOverlay)
        }
    }, [map])

    useEffect(() => {
        overlay?.setPosition(coordinate ? fromLonLat([coordinate.lng, coordinate.lat]) : undefined)
    }, [coordinate])

    return <div ref={container}>{children}</div>
}
