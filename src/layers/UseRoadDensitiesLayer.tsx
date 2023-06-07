import { Map } from 'ol'
import { useEffect } from 'react'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { GeoJSON } from 'ol/format'
import { Stroke, Style } from 'ol/style'
import { fromLonLat } from 'ol/proj'

const roadDensitiesLayerKey = 'roadDensitiesLayer'

export default function useRoadDensitiesLayer(map: Map, roads: any) {
    useEffect(() => {
        removeRoadDensitiesLayer(map)
        addRoadDensitiesLayer(map, roads)
        return () => {
            removeRoadDensitiesLayer(map)
        }
    }, [map, roads])
}

function addRoadDensitiesLayer(map: Map, roads: any) {
    const layer = new VectorLayer({
        source: new VectorSource({
            features: new GeoJSON().readFeatures({
                type: 'FeatureCollection',
                features: roads.map((r: any) => {
                    return {
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: r.linestring.coordinates.map((c: any) => fromLonLat(c)),
                        },
                        properties: r.properties,
                    }
                }),
            }),
        }),
        style: (f: any) => {
            return new Style({
                stroke: new Stroke({
                    color: f.getProperties().residential ? 'red' : 'blue',
                    width: 2,
                }),
            })
        },
    })
    layer.set(roadDensitiesLayerKey, true)
    layer.setZIndex(10.1)
    map.addLayer(layer)
}

function removeRoadDensitiesLayer(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(roadDensitiesLayerKey))
        .forEach(l => map.removeLayer(l))
}
