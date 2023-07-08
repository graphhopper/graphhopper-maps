import React, { useEffect } from 'react'
import { Feature, Map } from 'ol'
import { Point } from 'ol/geom'
import { fromLonLat } from 'ol/proj'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { Icon, Style } from 'ol/style'
import { getCenter } from 'ol/extent'
import { TurnNavigationStoreState } from '@/stores/TurnNavigationStore'
import { Tile } from 'ol/layer'
import { getCurrentBackgroundLayers } from '@/layers/UseBackgroundLayer'

// This class renders just the arrow on the current location. The map rotation is done elsewhere and the arrow will
// always point to north.
export default function useCurrentLocationLayer(map: Map, turnNavigation: TurnNavigationStoreState) {
    const point = new Point(fromLonLat([turnNavigation.coordinate.lng, turnNavigation.coordinate.lat]))
    const feature = new Feature({ geometry: point })
    // Synchronize the position of the view animation (see MapActionReceiver) with the arrow via the "postrender" event.
    // Note that setting updateWhileAnimating = true for currentLocationLayer is necessary to see the animation.
    const onPostrender = () => point.setCoordinates(getCenter(map.getView().calculateExtent()))

    useEffect(() => {
        if (!turnNavigation.showUI) return
        const currentLocationLayer = addCurrentLocation(map, feature)

        // Attach the "postrender" event to the non-empty current background layer, because the event isn't triggered if the layer is empty.
        // Somehow the current location layer is empty for longer zoom durations e.g. here point=51.438901%2C14.245252&point=53.550341%2C10.000654&fake=10 and so it cannot be used.
        // If the background would be a VectorLayer we could just add the arrow as feature there but we allow raster layers
        // and so we need a separate layer.
        const layers = getCurrentBackgroundLayers(map)
        const backgroundLayer = layers.length > 0 ? (layers[0] as Tile<any>) : null
        if (backgroundLayer == null) console.error('Cannot find background layer ' + layers.length)
        else if (turnNavigation.settings.syncView) {
            console.log('Found background layer ' + layers.length)
            backgroundLayer.on('postrender', onPostrender)
        }

        return () => {
            if (!turnNavigation.showUI) return
            if (backgroundLayer == null) console.error('Cannot find background layer ' + JSON.stringify(layers))
            else if (turnNavigation.settings.syncView) backgroundLayer.un('postrender', onPostrender)
            map.removeLayer(currentLocationLayer)
        }
    }, [turnNavigation.showUI, turnNavigation.settings.syncView])
}

// we need a filled version of navigation.svg
const svgArrowData =
    '<svg xmlns="http://www.w3.org/2000/svg" height="60" width="60">' +
    '  <ellipse style="fill:rgba(255,255,255,0.6865);stroke:none;stroke-width:0.579884;stroke-opacity:1" cx="30" cy="30.8" rx="29.9" ry="29.9"/>' +
    '  <path style="fill:rgb(107,165,255);stroke:none;" d="m 30.125271,9.9534187 -15.937653,36.3577693 1.494157,1.49415 14.443496,-6.574279 z M 25.61392,37.720331 Z"/>' +
    '  <path style="fill:rgb(3,89,194);stroke:none;" d="M 30.121972,9.9492547 46.059618,46.307018 44.565463,47.801171 30.121972,41.226889 Z m 4.511345,27.7669023 z"/>' +
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
