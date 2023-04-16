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

export default function useCurrentLocationLayer(map: Map, turnNavigation: TurnNavigationStoreState) {
    const point = new Point(fromLonLat([turnNavigation.coordinate.lng, turnNavigation.coordinate.lat]))
    const feature = new Feature({ geometry: point })
    // Synchronize the position of the view animation (see MapActionReceiver) with the arrow via postrender event.
    // Note that updateWhileAnimating = true for currentLocationLayer is necessary.
    const onPostrender = () => point.setCoordinates(getCenter(map.getView().calculateExtent()))

    useEffect(() => {
        if (!turnNavigation.showUI) return
        const currentLocationLayer = addCurrentLocation(map, feature)

        // attach postrender to current background layer, because for currentLocationLayer it might not be triggered if empty
        // (somehow it will be empty for longer zoom durations e.g. here point=51.438901%2C14.245252&point=53.550341%2C10.000654&fake )
        // (if background would be a VectorLayer we could just add the arrow as feature there but we allow rasters and so we need a separate currentLocationLayer)
        const layers = getCurrentBackgroundLayers(map)
        const backgroundLayer = layers.length > 0 ? (layers[0] as Tile<any>) : null
        if (backgroundLayer == null) console.error('Cannot find background layer ' + JSON.stringify(layers))
        else if (turnNavigation.settings.syncView) backgroundLayer.on('postrender', onPostrender)

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
    '<svg xmlns="http://www.w3.org/2000/svg" height="48" width="48">' +
    '  <ellipse style="fill:rgba(255,255,255,0.6865);stroke:none;stroke-width:0.579884;stroke-opacity:1" cx="24.3" cy="24.3" rx="19.71" ry="19.71" />' +
    '  <path style="fill:rgb(107,165,255);stroke:none;" d="M 24.127893,7.7265768 12.040694,35.300496 13.17387,36.433671 24.127893,31.447702 Z M 20.706461,28.785147 Z" />' +
    '  <path style="fill:rgb(3,89,194);stroke:none;" d="m 24.125389,7.723414 12.087198,27.573919 -1.133174,1.133175 -10.954024,-4.985969 z m 3.421432,21.058569 z" />' +
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