import { Feature, Map } from 'ol'
import { useEffect } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { GeoJSON } from 'ol/format'
import { Fill, Stroke, Style } from 'ol/style'
import { Draw, Modify, Snap } from 'ol/interaction'
import Dispatcher from '@/stores/Dispatcher'
import { SetCustomModel } from '@/actions/Actions'

const areasLayerKey = 'areasLayer'

export default function useAreasLayer(map: Map, cmEnabled: boolean, customModelStr: string) {
    useEffect(() => {
        removeAreasLayer(map)
        addAreasLayer(map, cmEnabled, customModelStr)
        return () => {
            removeAreasLayer(map)
        }
    }, [map, cmEnabled, customModelStr])
}

let index = 0
function addAreasLayer(map: Map, cmEnabled: boolean, customModelStr: string) {
    if (!cmEnabled) return
    let customModel
    try {
        customModel = JSON.parse(customModelStr)
    } catch {
        return
    }

    index++
    console.log('custom model ' + index+ ' ' + customModelStr.length)

    const style = new Style({
        stroke: new Stroke({
            color: '#0e6dff',
            width: 3,
        }),
        fill: new Fill({
            color: 'rgba(229,229,229,0.5)',
        }),
    })
    const areas = readGeoJSONFeatures(customModel?.areas)
    const features = areas ? areas : []
    const source = new VectorSource({
        features: features,
    })
    const layer = new VectorLayer({
        source: source,
        style: style,
    })
    layer.set(areasLayerKey, true)
    layer.setZIndex(10)
    map.addLayer(layer)

    // it seems we don't need to call source.un when we remove the layer
    source.on('addfeature', e => {
        if (!cmEnabled) return
        if (!e.feature) return
        try {
            customModel = JSON.parse(customModelStr)
        } catch (e) {
            return
        }

        console.log("addfeature => " + index + " length: " + customModelStr.length)
        // clone! Because otherwise the object itself will be transformed and it disappears from the map
        const geometry = e.feature.getGeometry()?.clone().transform('EPSG:3857', 'EPSG:4326')

        // https://github.com/graphhopper/graphhopper/blob/master/docs/core/custom-models.md#areas
        const writer = new GeoJSON()
        const featureAsString = writer.writeFeature(new Feature(geometry))
        const areaFeature = JSON.parse(featureAsString)
        let maxId = 0
        if (customModel.areas?.features) {
            const numArr = customModel.areas.features.map((obj: any) =>
                obj['id'] ? parseInt(obj['id'].match(/\d+/)[0]) : 0
            )
            if (numArr.length > 0) maxId = Math.max(...numArr)
        } else {
            customModel.areas = { type: 'FeatureCollection', features: [] }
        }

        areaFeature.id = 'area' + (maxId + 1)
        areaFeature.properties = {}
        // reduce precision
        areaFeature.geometry.coordinates[0] = areaFeature.geometry.coordinates[0].map((arr: number[]) => [
            Math.round(arr[0] * 1_000_000) / 1_000_000,
            Math.round(arr[1] * 1_000_000) / 1_000_000,
        ])

        customModel.areas.features.push(areaFeature)
        // add rule that excludes the new area
        customModel.priority.push({ if: 'in_' + areaFeature.id, multiply_by: '0' })
        // TODO NOW why is customModelStr stale and I need this here?
        //  and even with this if we edit the custom model box directly and afterwards add an area the removed areas disappear!?
        //  we can try useRef?
        customModelStr = JSON.stringify(customModel, null, 2)
        Dispatcher.dispatch(new SetCustomModel(customModelStr, true))
        return false
    })

    // if interactions were already added
    // prettier-ignore
    if (map.getInteractions().getArray().some(i => i instanceof Draw))
        return
    // map.getInteractions().getArray().forEach(i => {
    //     if (i instanceof Draw || i instanceof Modify || i instanceof Snap)
    //         map.removeInteraction(i)
    // })

    const modify = new Modify({ source: source })
    map.addInteraction(modify)

    const draw = new Draw({ source: source, type: 'Polygon' })
    map.addInteraction(draw)

    modify.on('modifyend', e => {
        e.features.forEach(function (feature) {
            // TODO NOW
            return true
        })
    })

    draw.on('drawstart', () => {
        /*source.clear()*/
    })

    // draw.on('drawend', e => {}) seems to be the same as source.on('addfeature')

    const snap = new Snap({ source: source })
    map.addInteraction(snap)
}

function readGeoJSONFeatures(areas: object | null) {
    try {
        return new GeoJSON({ featureProjection: 'EPSG:3857' }).readFeatures(areas)
    } catch (e) {
        return null
    }
}

function removeAreasLayer(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(areasLayerKey))
        .forEach(l => map.removeLayer(l))
}
