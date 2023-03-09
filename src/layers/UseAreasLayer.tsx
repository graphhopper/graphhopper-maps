import { Map } from 'ol'
import { useEffect } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { GeoJSON } from 'ol/format'
import { Stroke, Style } from 'ol/style'

const areasLayerKey = 'areasLayer'

export default function useAreasLayer(map: Map, areas: object | null) {
    useEffect(() => {
        removeAreasLayer(map)
        addAreasLayer(map, areas)
        return () => {
            removeAreasLayer(map)
        }
    }, [map, areas])
}

function addAreasLayer(map: Map, areas: object | null) {
    const features = readGeoJSONFeatures(areas)
    // reading the GeoJSON can fail due to all kinds of missing fields, wrong types etc. in the input areas, so we
    // just don't display anything in these cases
    if (!features) return
    const style = new Style({
        stroke: new Stroke({
            color: '#FF0000',
            width: 2,
        }),
    })
    const layer = new VectorLayer({
        source: new VectorSource({
            features: features,
        }),
        style: style,
    })
    layer.set(areasLayerKey, true)
    layer.setZIndex(10)
    map.addLayer(layer)
}

function readGeoJSONFeatures(areas: object | null) {
    try {
        return new GeoJSON({featureProjection: 'EPSG:3857'}).readFeatures(areas)
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
