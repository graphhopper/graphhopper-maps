import { Feature, Map } from 'ol'
import { MutableRefObject, useEffect, useRef } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { GeoJSON } from 'ol/format'
import { Fill, Stroke, Style } from 'ol/style'
import { Draw, Interaction, Modify, Select, Snap } from 'ol/interaction'
import Dispatcher from '@/stores/Dispatcher'
import { SetCustomModel } from '@/actions/Actions'
import { Geometry } from 'ol/geom'

const areasLayerKey = 'areasLayer'

export default function useAreasLayer(map: Map, modifyOrNewAreas: boolean, customModelStr: string, cmEnabled: boolean) {
    const cmRef = useRef(customModelStr)
    useEffect(() => {
        removeAreasLayer(map)
        cmRef.current = customModelStr // ensure to always get the most recent custom model into the 'addfeature' callback
        addAreasLayer(map, modifyOrNewAreas, cmRef)
        return () => {
            removeAreasLayer(map)
        }
    }, [map, modifyOrNewAreas, cmEnabled, customModelStr])
}

function addAreasLayer(map: Map, modifyOrNewAreas: boolean, customModelStr: MutableRefObject<string>) {
    let tmpCustomModel = getCustomModel(customModelStr.current)
    if (tmpCustomModel == null) return

    const style = new Style({
        stroke: new Stroke({
            color: '#F97777',
            width: 3,
        }),
        fill: new Fill({
            color: 'rgba(229,229,229,0.5)',
        }),
    })
    const areas = readGeoJSONFeatures(tmpCustomModel?.areas)
    const features = areas ? areas : []
    const source = new VectorSource({
        features: features,
    })
    const layer = new VectorLayer({
        source: source,
        style: style,
    })
    layer.set(areasLayerKey, true)
    layer.setZIndex(1)
    map.addLayer(layer)

    if (!modifyOrNewAreas) {
        disableInteractions(map)
        return
    }

    // Until here we just showed the areas. Now add user interactions to create new areas and modify existing.
    const modify = new Modify({ source: source })
    modify.set('source', 'gh:areas')
    map.addInteraction(modify)
    modify.on('modifyend', e => {
        const customModel = getCustomModel(customModelStr.current)
        if (customModel == null) return
        e.features.getArray().forEach(feature => {
            const newFeature = convertFeature(feature as Feature<Geometry>)
            newFeature.id = feature.getId()
            customModel.areas.features = customModel.areas.features.map((f: any) =>
                f.id == feature.getId() ? newFeature : f
            )
        })

        const str = JSON.stringify(customModel, null, 2)
        Dispatcher.dispatch(new SetCustomModel(str, true))
    })

    const draw = new Draw({ source: source, type: 'Polygon' })
    draw.set('source', 'gh:areas')
    map.addInteraction(draw)
    // it seems we don't need to call source.un when we remove the interaction
    draw.on('drawend', e => {
        if (!e.feature) return
        const customModel = getCustomModel(customModelStr.current)
        if (customModel == null) return

        let maxId = 0
        if ((customModel.areas as any)?.features) {
            const numArr = customModel.areas.features.map((obj: any) =>
                obj['id'] ? parseInt(obj['id'].match(/\d+/)[0]) : 0
            )
            if (numArr.length > 0) maxId = Math.max(...numArr)
        } else {
            customModel.areas = { type: 'FeatureCollection', features: [] }
        }

        const areaFeature = convertFeature(e.feature)
        areaFeature.id = 'area' + (maxId + 1)
        customModel.areas.features.push(areaFeature)

        // add rule that excludes the new area
        customModel.priority.push({ if: 'in_' + areaFeature.id, multiply_by: '0' })
        const str = JSON.stringify(customModel, null, 2)
        Dispatcher.dispatch(new SetCustomModel(str, true))
        return false
    })

    const snap = new Snap({ source: source })
    snap.set('source', 'gh:areas')
    map.addInteraction(snap)
}

function disableInteractions(map: Map) {
    // prettier-ignore
    map.getInteractions().getArray().forEach(i => {
        if ('gh:areas' == i.get('source') && (i instanceof Draw || i instanceof Modify || i instanceof Snap || i instanceof Select))
            i.setActive(false)
    })
}

function getCustomModel(cm: string) {
    try {
        return JSON.parse(cm)
    } catch {
        return null
    }
}

/**
 * Coordinate transformation from openlayers to GeoJSON and reduce coordinate precision to reduce body size when querying
 */
function convertFeature(feature: Feature<Geometry>) {
    // clone! Because otherwise the object itself will be transformed and it disappears from the map
    const geometry = feature.getGeometry()?.clone().transform('EPSG:3857', 'EPSG:4326')

    // https://github.com/graphhopper/graphhopper/blob/master/docs/core/custom-models.md#areas
    const writer = new GeoJSON()
    const featureAsString = writer.writeFeature(new Feature(geometry))
    const areaFeature = JSON.parse(featureAsString)
    areaFeature.properties = {}
    // reduce precision
    areaFeature.geometry.coordinates[0] = areaFeature.geometry.coordinates[0].map((arr: number[]) => [
        Math.round(arr[0] * 1_000_000) / 1_000_000,
        Math.round(arr[1] * 1_000_000) / 1_000_000,
    ])
    return areaFeature
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
