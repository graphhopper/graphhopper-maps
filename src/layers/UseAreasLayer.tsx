import { Map } from 'ol'
import { useEffect } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { GeoJSON } from 'ol/format'
import { Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'

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
    const layer = new VectorLayer({
        source: new VectorSource({
            features: features,
        }),
        style: new Style({
            stroke: new Stroke({
                color: '#FF0000',
                width: 2,
            }),
        }),
    })
    layer.set(areasLayerKey, true)
    layer.setZIndex(10)
    map.addLayer(layer)
}

function readGeoJSONFeatures(areas: object | null) {
    try {
        // we need to transform the coordinates, not sure if there is an easier (and more stable) way to do this...
        const transformedAreas = {
            ...areas,
            features: (areas as any)?.features?.map((f: any) => {
                return {
                    ...f,
                    geometry: {
                        ...f.geometry,
                        coordinates: f.geometry.coordinates.map((c: number[][]) =>
                            c.map((c: number[]) => {
                                return fromLonLat(c)
                            })
                        ),
                    },
                }
            }),
        }
        return new GeoJSON().readFeatures(transformedAreas)
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
