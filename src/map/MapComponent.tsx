import 'ol/ol.css'
import styles from '@/map/Map.module.css'
import { useEffect, useRef, useState } from 'react'
import { Map } from 'ol'
import { Bbox } from '@/api/graphhopper'
import Dispatcher from '@/stores/Dispatcher'
import { ErrorAction } from '@/actions/Actions'
import { tr } from '@/translation/Translation'
import { Coordinate, getBBoxFromCoord } from '@/utils'
import { addUnselectedPathsLayer, addSelectedPathsLayer, addAccessNetworkLayer, removeCurrentPathLayers } from '@/layers/UsePathsLayer'
import { Path } from '@/api/graphhopper'
import { QueryPoint } from '@/stores/QueryStore'
import VisibilityOnIcon  from '@/sidebar/visibility_on.svg'
import VisibilityOffIcon  from '@/sidebar/visibility_off.svg'

type MapComponentProps = {
    map: Map,
    paths: Path[],
    selectedPath: Path,
    queryPoints: QueryPoint[]
}

/** A small react component that simply attaches our map instance to a div to show the map **/
export default function ({
    map, paths, selectedPath, queryPoints, smallScreenRoutingResultVisible
}: MapComponentProps & { smallScreenRoutingResultVisible?: boolean }) {
    const mapElement = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        map.setTarget(mapElement.current!)
    }, [map])
    const [showPaths, setShowPaths] = useState(true)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'h') setShowPaths(false)
      }
      const handleKeyUp = (e: KeyboardEvent) => {
          if (e.key === 'h') setShowPaths(true)
      }
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)
      return () => {
          window.removeEventListener('keydown', handleKeyDown)
          window.removeEventListener('keyup', handleKeyUp)
      }
    }, [])
    useEffect(() => {
        removeCurrentPathLayers(map)
        if (showPaths) {
            addUnselectedPathsLayer(map, paths.filter(p => p != selectedPath))
            addSelectedPathsLayer(map, selectedPath)
            addAccessNetworkLayer(map, selectedPath, queryPoints)
        }
        return () => {
            removeCurrentPathLayers(map)
        }
    }, [map, paths, selectedPath, showPaths])
    return (
        <div
            ref={mapElement}
            className={
                styles.mapContainer +
                (smallScreenRoutingResultVisible ? ' ' + styles.smallScreenRoutingResultVisible : '')
            }
        >
            <div className={styles.topBar}>
                <button
                  className={styles.hidePathsButton}
                  onClick={() => setShowPaths(v => !v)}
                  title={showPaths ? tr('hide_route') : tr('show_route')}
                >
                  {showPaths ? <VisibilityOffIcon width={20} height={20} /> : <VisibilityOnIcon width={20} height={20} />}
                </button>
            </div>
        </div>
    )
}

export function onCurrentLocationSelected(
    onSelect: (queryText: string, coordinate: Coordinate | undefined, bbox: Bbox | undefined) => void
) {
    if (!navigator.geolocation) {
        Dispatcher.dispatch(new ErrorAction('Geolocation is not supported in this browser'))
        return
    }

    onSelect(tr('searching_location') + ' ...', undefined, undefined)
    navigator.geolocation.getCurrentPosition(
        position => {
            const coordinate = { lat: position.coords.latitude, lng: position.coords.longitude }
            onSelect(tr('current_location'), coordinate, getBBoxFromCoord(coordinate))
        },
        error => {
            Dispatcher.dispatch(new ErrorAction(tr('searching_location_failed') + ': ' + error.message))
            onSelect('', undefined, undefined)
        },
        // DO NOT use e.g. maximumAge: 5_000 -> getCurrentPosition will then never return on mobile firefox!?
        { timeout: 300_000, enableHighAccuracy: true }
    )
}

export function onCurrentLocationButtonClicked(onSelect: (coordinate: Coordinate | undefined) => void) {
    if (!navigator.geolocation) {
        Dispatcher.dispatch(new ErrorAction('Geolocation is not supported in this browser'))
        onSelect(undefined)
        return
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            onSelect({ lat: position.coords.latitude, lng: position.coords.longitude })
        },
        error => {
            Dispatcher.dispatch(new ErrorAction(tr('searching_location_failed') + ': ' + error.message))
            onSelect(undefined)
        },
        // DO NOT use e.g. maximumAge: 5_000 -> getCurrentPosition will then never return on mobile firefox!?
        { timeout: 300_000, enableHighAccuracy: true }
    )
}
