import React, {useEffect} from 'react'
import {Feature, Map} from 'ol'
import {Point} from 'ol/geom'
import {fromLonLat} from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import {Icon, Style} from 'ol/style'
import {getCenter} from 'ol/extent'
import {TurnNavigationStoreState} from "@/stores/TurnNavigationStore";

export default function useCurrentLocationLayer(map: Map, turnNavigation: TurnNavigationStoreState) {
    const point = new Point(fromLonLat([turnNavigation.coordinate.lng, turnNavigation.coordinate.lat]))
    const feature = new Feature({geometry: point})
    // Synchronize the position of the view animation (see MapActionReceiver) with the arrow via postrender event.
    // Note that updateWhileAnimating = true for currentLocationLayer is necessary.
    const onPostrender = () => point.setCoordinates(getCenter(map.getView().calculateExtent()))

    useEffect(() => {
        if(!turnNavigation.showUI) return
        const currentLocationLayer = addCurrentLocation(map, feature)
        currentLocationLayer.on('postrender', onPostrender)

        return () => {
            if(!turnNavigation.showUI) return
            currentLocationLayer.un('postrender', onPostrender)
            map.removeLayer(currentLocationLayer)
        }
    }, [turnNavigation.showUI])
}

// we need a filled version of navigation.svg
const svgArrowData =
    '<svg xmlns="http://www.w3.org/2000/svg" height="48" width="48">' +
    '<path style="fill:rgb(107,165,255); stroke:none;" d="M 24.13483,3.8557243 8.1348294,40.355724 l 1.5,1.5 14.5000006,-6.6 z M 19.605832,31.73126 Z" />' +
    '<path style="fill:rgb(3,89,194); stroke:none;" d="m 24.131517,3.8515376 16,36.4999994 -1.5,1.5 -14.5,-6.6 z m 4.528998,27.8755354 z" />' +
    '</svg>'

function addCurrentLocation(map: Map, feature: Feature) {
    const currentLocationLayer = new VectorLayer({
        source: new VectorSource({
            features: [feature]
        }),
        updateWhileAnimating: true,
        updateWhileInteracting: true
    })
    currentLocationLayer.set('gh:current_location', true)
    currentLocationLayer.setZIndex(3)
    currentLocationLayer.setStyle(
        () =>
            new Style({
                image: new Icon({
                    displacement: [0, 0],
                    src: 'data:image/svg+xml;utf8,' + svgArrowData,
                }),
            })
    )
    map.addLayer(currentLocationLayer)
    return currentLocationLayer
}
