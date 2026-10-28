import { useEffect } from 'react'
import { Feature, Map } from 'ol'
import { Point } from 'ol/geom'
import { fromLonLat } from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Icon, Style } from 'ol/style'
import { TurnNavigationStoreState } from '@/stores/TurnNavigationStore'

// This class renders just the arrow on the current location. The map rotation is done elsewhere and the arrow will
// always point to north.
export default function useNavigationLocationLayer(map: Map, turnNavigation: TurnNavigationStoreState) {
    const point = new Point(fromLonLat([turnNavigation.coordinate.lng, turnNavigation.coordinate.lat]))
    const feature = new Feature({ geometry: point })
    // Synchronize the arrow with the view animation (see MapActionReceiver): the animation sets the view center
    // every frame, before the layers render. Note that updateWhileAnimating = true for currentLocationLayer is
    // necessary to see the animation.
    const onCenterChange = () => {
        const center = map.getView().getCenter()
        if (center) point.setCoordinates(center)
    }

    useEffect(() => {
        if (!turnNavigation.showUI) return
        const currentLocationLayer = addCurrentLocation(map, feature)
        if (turnNavigation.settings.syncView) map.getView().on('change:center', onCenterChange)

        return () => {
            if (turnNavigation.settings.syncView) map.getView().un('change:center', onCenterChange)
            map.removeLayer(currentLocationLayer)
        }
    }, [turnNavigation.showUI, turnNavigation.settings.syncView])
}

// we need a filled version of navigation.svg
const svgArrowData =
    '<svg xmlns="http://www.w3.org/2000/svg" height="50" width="50">' +
    '  <ellipse style="fill:rgba(255,255,255,0.6865);stroke:none;stroke-opacity:1" cx="25" cy="25" rx="25" ry="25" />' +
    '  <path style="fill:rgb(107,165,255);stroke:none;" d="M 24.776074,3.1477509 8.838421,39.50552 10.332578,40.99967 24.776074,34.425391 Z M 20.264723,30.914663 Z"/>' +
    '  <path style="fill:rgb(3,89,194);stroke:none;" d="M 24.772775,3.1435869 40.710421,39.50135 39.216266,40.995503 24.772775,34.421221 Z M 29.28412,30.910489 Z"/>' +
    '</svg>'

function addCurrentLocation(map: Map, feature: Feature) {
    const currentLocationLayer = new VectorLayer({
        source: new VectorSource({
            features: [feature],
        }),
        updateWhileAnimating: true,
        updateWhileInteracting: true,
    })
    currentLocationLayer.set('gh:current_location', true)
    currentLocationLayer.setZIndex(3)
    const style = new Style({
        image: new Icon({
            displacement: [0, 0],
            src: 'data:image/svg+xml;utf8,' + svgArrowData,
        }),
    })
    currentLocationLayer.setStyle(() => style)
    map.addLayer(currentLocationLayer)
    return currentLocationLayer
}
