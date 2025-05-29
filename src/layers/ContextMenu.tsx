import { Map, Overlay } from 'ol'
import { ContextMenuContent } from '@/map/ContextMenuContent'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { QueryPoint } from '@/stores/QueryStore'
import { fromLonLat, toLonLat } from 'ol/proj'
import styles from '@/layers/ContextMenu.module.css'
import { RouteStoreState } from '@/stores/RouteStore'
import { Coordinate } from '@/utils'
import Dispatcher from '@/stores/Dispatcher'
import { AddPoint, SetPoint } from '@/actions/Actions'
import { coordinateToText } from '@/Converters'
import { SettingsContext } from '@/contexts/SettingsContext'

interface ContextMenuProps {
    map: Map
    route: RouteStoreState
    queryPoints: QueryPoint[]
}

const overlay = new Overlay({
    autoPan: true,
})

export default function ContextMenu({ map, route, queryPoints }: ContextMenuProps) {
    const [menuCoordinate, setMenuCoordinate] = useState<Coordinate | null>(null)
    const container = useRef<HTMLDivElement | null>(null)
    const settings = useContext(SettingsContext)

    const openContextMenu = useCallback(
        (e: any) => {
            e.preventDefault()
            const coordinate = map.getEventCoordinate(e)
            const lonLat = toLonLat(coordinate)
            setMenuCoordinate({ lng: lonLat[0], lat: lonLat[1] })
        },
        [map]
    )

    const handleClick = useCallback(
        (e: any) => {
            if (e.dragging) return

            // If click is inside the context menu, do nothing
            const clickedElement = document.elementFromPoint(e.pixel[0], e.pixel[1])
            if (container.current?.contains(clickedElement)) {
                return
            }

            if (menuCoordinate) {
                // Context menu is open -> close it and skip adding a point
                setMenuCoordinate(null)
                return
            }

            if (!settings.addPointOnClick) return

            const lonLat = toLonLat(e.coordinate)
            const myCoord = { lng: lonLat[0], lat: lonLat[1] }

            let idx = queryPoints.length
            if (idx == 2) {
                if (!queryPoints[1].isInitialized) idx--
            }
            if (idx == 1) {
                if (!queryPoints[0].isInitialized) idx--
            }
            if (idx < 2) {
                const setPoint = new SetPoint(
                    {
                        ...queryPoints[idx],
                        coordinate: myCoord,
                        queryText: coordinateToText(myCoord),
                        isInitialized: true,
                    },
                    false
                )
                Dispatcher.dispatch(setPoint)
            } else Dispatcher.dispatch(new AddPoint(idx, myCoord, true, false))
        },
        [menuCoordinate, settings.addPointOnClick, queryPoints]
    )

    useEffect(() => {
        overlay.setElement(container.current!)
        map.addOverlay(overlay)

        const longTouchHandler = new LongTouchHandler(e => openContextMenu(e))

        function onMapTargetChange() {
            // it is important to setup new listeners whenever the map target changes, like when we switch between the
            // small and large screen layout, see #203

            // we cannot listen to right-click simply using map.on('contextmenu') and need to add the listener to
            // the map container instead
            // https://github.com/openlayers/openlayers/issues/12512#issuecomment-879403189
            map.getTargetElement().addEventListener('contextmenu', openContextMenu)

            map.getTargetElement().addEventListener('touchstart', e => longTouchHandler.onTouchStart(e))
            map.getTargetElement().addEventListener('touchmove', () => longTouchHandler.onTouchEnd())
            map.getTargetElement().addEventListener('touchend', () => longTouchHandler.onTouchEnd())
        }
        map.on('singleclick', handleClick)
        map.on('change:target', onMapTargetChange)

        return () => {
            const targetElement = map.getTargetElement()
            if (targetElement) {
                targetElement.removeEventListener('contextmenu', openContextMenu)
                targetElement.removeEventListener('touchstart', e => longTouchHandler.onTouchStart(e))
                targetElement.removeEventListener('touchmove', () => longTouchHandler.onTouchEnd())
                targetElement.removeEventListener('touchend', () => longTouchHandler.onTouchEnd())
            }
            map.un('singleclick', handleClick)
            map.removeOverlay(overlay)
            map.un('change:target', onMapTargetChange)
        }
    }, [map, openContextMenu, handleClick])

    useEffect(() => {
        overlay.setPosition(menuCoordinate ? fromLonLat([menuCoordinate.lng, menuCoordinate.lat]) : undefined)
    }, [menuCoordinate])

    return (
        <div className={styles.contextMenu} ref={container}>
            {menuCoordinate && (
                <ContextMenuContent
                    coordinate={menuCoordinate!}
                    queryPoints={queryPoints}
                    route={route}
                    onSelect={() => setMenuCoordinate(null)}
                />
            )}
        </div>
    )
}

// See #229
class LongTouchHandler {
    private readonly callback: (e: any) => void
    private currentTimeout: number = 0
    private currentEvent?: any

    constructor(onLongTouch: (e: any) => void) {
        this.callback = onLongTouch
    }

    onTouchStart(e: any) {
        this.currentEvent = e
        this.currentTimeout = window.setTimeout(() => {
            console.log('long touch')
            if (this.currentEvent) this.callback(this.currentEvent)
        }, 500)
    }

    onTouchEnd() {
        console.log('touch end')
        window.clearTimeout(this.currentTimeout)
        this.currentEvent = undefined
    }
}
