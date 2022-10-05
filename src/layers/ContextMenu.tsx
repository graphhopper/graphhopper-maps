import { Map, Overlay } from 'ol'
import { PopupComponent } from '@/map/Popup'
import React, { useEffect, useRef, useState } from 'react'
import { Coordinate, QueryPoint } from '@/stores/QueryStore'
import { toLonLat } from 'ol/proj'
import styles from '@/layers/ContextMenu.module.css'
import { RouteStoreState } from '@/stores/RouteStore'

interface ContextMenuProps {
    map: Map
    route: RouteStoreState
    queryPoints: QueryPoint[]
}

export default function ContextMenu({ map, route, queryPoints }: ContextMenuProps) {
    const [menuCoordinate, setMenuCoordinate] = useState<Coordinate | null>(null)
    const [overlay, setOverlay] = useState<Overlay | undefined>()

    const container = useRef<HTMLDivElement | null>()

    useEffect(() => {
        const overlay = new Overlay({
            element: container.current!,
            autoPan: true,
        })
        setOverlay(overlay)
        map.addOverlay(overlay)

        function openContextMenu(e: any) {
            e.preventDefault()
            const coordinate = map.getEventCoordinate(e)
            const lonLat = toLonLat(coordinate)
            setMenuCoordinate({ lng: lonLat[0], lat: lonLat[1] })
            overlay.setPosition(coordinate)
        }

        const touchHandler = new TouchHandler(e => openContextMenu(e))

        map.once('change:target', () => {
            // we cannot listen to right-click simply using map.on('contextmenu') and need to add the listener to
            // the map container instead
            // https://github.com/openlayers/openlayers/issues/12512#issuecomment-879403189
            map.getTargetElement().addEventListener('contextmenu', openContextMenu)

            map.getTargetElement().addEventListener('touchstart', e => touchHandler.onTouchStart(e))
            map.getTargetElement().addEventListener('touchmove', e => touchHandler.onTouchMove(e))
            map.getTargetElement().addEventListener('touchend', e => touchHandler.onTouchEnd(e))

            map.on('click', () => {
                overlay?.setPosition(undefined)
                setMenuCoordinate(null)
            })
        })

        return () => {
            map.getTargetElement().removeEventListener('contextmenu', openContextMenu)
            map.removeOverlay(overlay)
        }
    }, [map])
    return (
        <div className={styles.popup} ref={container as any}>
            {menuCoordinate && (
                <PopupComponent
                    coordinate={menuCoordinate!}
                    queryPoints={queryPoints}
                    route={route}
                    onSelect={() => {
                        overlay?.setPosition(undefined)
                        setMenuCoordinate(null)
                    }}
                />
            )}
        </div>
    )
}

// See #229
class TouchHandler {
    private readonly onLongTouch: (e: any) => void

    private touchStartEvent?: any
    private currentTimeout: number = 0
    ongoing: boolean = false

    constructor(onLongTouch: (e: any) => void) {
        this.onLongTouch = onLongTouch
    }

    onTouchStart(e: any) {
        this.touchStartEvent = e
        this.currentTimeout = window.setTimeout(() => {
            if (this.ongoing) {
                this.onLongTouch(this.touchStartEvent)
                this.ongoing = false
            }
        }, 500)
        this.ongoing = true
    }

    onTouchMove(e: any) {
        window.clearTimeout(this.currentTimeout)
    }

    onTouchEnd(e: any) {
        window.clearTimeout(this.currentTimeout)
    }
}
