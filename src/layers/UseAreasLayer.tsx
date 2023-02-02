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
    if (!areas) return
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
    const layer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures(transformedAreas),
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

function removeAreasLayer(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(areasLayerKey))
        .forEach(l => map.removeLayer(l))
}
