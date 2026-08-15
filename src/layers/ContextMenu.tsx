import { Feature, Map, MapBrowserEvent, Overlay } from 'ol'
import { ContextMenuContent } from '@/map/ContextMenuContent'
import { useEffect, useRef, useState } from 'react'
import { QueryPoint } from '@/stores/QueryStore'
import { fromLonLat, toLonLat } from 'ol/proj'
import styles from '@/layers/ContextMenu.module.css'
import { RouteStoreState } from '@/stores/RouteStore'
import { Coordinate } from '@/utils'

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
    // mirror of menuCoordinate for use in the map listeners which are registered only once
    const isOpen = useRef(false)

    const openContextMenu = (e: any) => {
        e.preventDefault()
        const coordinate = map.getEventCoordinate(e)
        const lonLat = toLonLat(coordinate)
        isOpen.current = true
        setMenuCoordinate({ lng: lonLat[0], lat: lonLat[1] })
    }

    const closeContextMenu = () => {
        isOpen.current = false
        setMenuCoordinate(null)
    }

    // 'singleclick' is only fired for a plain click, i.e. not when the map was panned and not for double clicks
    const onSingleClick = (e: MapBrowserEvent<any>) => {
        if (isOpen.current) {
            // a click while the menu is shown only closes it and does not open a new one at the clicked location
            closeContextMenu()
            return
        }
        // do not open the menu when clicking interactive features (POIs, paths, markers), they handle clicks themselves
        const atFeature = map.getFeaturesAtPixel(e.pixel, { hitTolerance: 5 }).some(f => f instanceof Feature)
        if (atFeature) return
        openContextMenu(e.originalEvent)
    }

    useEffect(() => {
        overlay.setElement(container.current!)
        map.addOverlay(overlay)

        const longTouchHandler = new LongTouchHandler(e => openContextMenu(e))
        const handleTouchStart = (e: any) => longTouchHandler.onTouchStart(e)
        const handleTouchMove = () => longTouchHandler.onTouchEnd()
        const handleTouchEnd = () => longTouchHandler.onTouchEnd()
        function onMapTargetChange() {
            // it is important to set up new listeners whenever the map target changes, like when we switch between the
            // small and large screen layout, see #203

            // we cannot listen to right-click simply using map.on('contextmenu') and need to add the listener to
            // the map container instead
            // https://github.com/openlayers/openlayers/issues/12512#issuecomment-879403189
            map.getTargetElement().addEventListener('contextmenu', openContextMenu)

            map.getTargetElement().addEventListener('touchstart', handleTouchStart)
            map.getTargetElement().addEventListener('touchmove', handleTouchMove)
            map.getTargetElement().addEventListener('touchend', handleTouchEnd)
        }
        map.on('change:target', onMapTargetChange)
        map.on('singleclick', onSingleClick)

        return () => {
            map.getTargetElement().removeEventListener('contextmenu', openContextMenu)

            map.getTargetElement().removeEventListener('touchstart', handleTouchStart)
            map.getTargetElement().removeEventListener('touchmove', handleTouchMove)
            map.getTargetElement().removeEventListener('touchend', handleTouchEnd)

            map.removeOverlay(overlay)
            map.un('change:target', onMapTargetChange)
            map.un('singleclick', onSingleClick)
        }
    }, [map])

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
                    onSelect={closeContextMenu}
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
        // console.log('touch end')
        window.clearTimeout(this.currentTimeout)
        this.currentEvent = undefined
    }
}
