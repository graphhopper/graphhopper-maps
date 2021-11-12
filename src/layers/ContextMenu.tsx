import { Map, Overlay } from 'ol'
import { PopupComponent } from '@/map/Popup'
import React, { useEffect, useRef, useState } from 'react'
import { Coordinate, QueryPoint } from '@/stores/QueryStore'
import { toLonLat } from 'ol/proj'
import styles from '@/layers/ContextMenu.module.css'

interface ContextMenuProps {
    map: Map
    queryPoints: QueryPoint[]
}

export default function ({ map, queryPoints }: ContextMenuProps) {
    const [menuCoordinate, setMenuCoordinate] = useState<Coordinate | null>(null)
    const [overlay, setOverlay] = useState<Overlay | undefined>()

    const container = useRef()

    useEffect(() => {
        const overlay = new Overlay({
            element: container.current as any,
            autoPan: true,
        })
        setOverlay(overlay)
        map.addOverlay(overlay)
        map.once('change:target', () => {
            // we cannot listen to right-click simply using map.on('contextmenu') and need to add the listener to
            // the map container instead
            // https://github.com/openlayers/openlayers/issues/12512#issuecomment-879403189
            map.getTargetElement().addEventListener('contextmenu', e => {
                e.preventDefault()
                const coordinate = map.getEventCoordinate(e)
                const lonLat = toLonLat(coordinate)
                setMenuCoordinate({ lng: lonLat[0], lat: lonLat[1] })
                overlay.setPosition(coordinate)
            })
        })
    }, [map])
    return (
        <div className={styles.popup} ref={container as any}>
            {menuCoordinate && (
                <PopupComponent
                    coordinate={menuCoordinate!}
                    queryPoints={queryPoints}
                    onSelect={() => {
                        overlay?.setPosition(undefined)
                        setMenuCoordinate(null)
                    }}
                />
            )}
        </div>
    )
}
