import { Feature, Map } from 'ol'
import { useEffect } from 'react'
import VectorTileSource from 'ol/source/VectorTile'
import { MVT } from 'ol/format'
import * as config from 'config'
import { Stroke, Style } from 'ol/style'
import { packColor, parseLiteralStyle } from 'ol/webgl/styleparser'
import WebGLVectorTileLayerRenderer from 'ol/renderer/webgl/VectorTileLayer'
import VectorTile from 'ol/layer/VectorTile'
import { asArray } from 'ol/color'
import { FeatureLike } from 'ol/Feature'

const urbanDensityLayerKey = 'urbanDensityLayer'

export default function useUrbanDensityLayer(map: Map, urbanDensityEnabled: boolean) {
    useEffect(() => {
        removeUrbanDensityLayer(map)
        if (urbanDensityEnabled) addUrbanDensityLayer(map)
        return () => {
            removeUrbanDensityLayer(map)
        }
    }, [map, urbanDensityEnabled])
}

function getStyle(feature: FeatureLike): Style | undefined {
    if (feature.get('layer') === 'roads') {
        const urbanDensity = feature.get('urban_density')
        let color = '#0aaff1'
        if (urbanDensity === 'residential') color = '#fd084a'
        else if (urbanDensity === 'city') color = '#edf259'
        return new Style({
            stroke: new Stroke({
                color,
                width: 2,
            }),
        })
    } else {
        // do not render this feature
        return undefined
    }
}

const result = parseLiteralStyle({
    'fill-color': ['get', 'fillColor'],
    'stroke-color': ['get', 'strokeColor'],
    'stroke-width': ['get', 'strokeWidth'],
});

class WebGLVectorTileLayer extends VectorTile {
    // @ts-ignore
    createRenderer() {
        return new WebGLVectorTileLayerRenderer(this, {
            style: {
                fill: {
                    fragment: result.builder.getFillFragmentShader(),
                    vertex: result.builder.getFillVertexShader(),
                },
                stroke: {
                    fragment: result.builder.getStrokeFragmentShader(),
                    vertex: result.builder.getStrokeVertexShader(),
                },
                symbol: {
                    fragment: result.builder.getSymbolFragmentShader(),
                    vertex: result.builder.getSymbolVertexShader(),
                },
                attributes: {
                    fillColor: {
                        size: 2,
                        callback: (feature : FeatureLike) => {
                            const style = getStyle(feature)
                            const color = asArray(style?.getFill()?.getColor() || '#eee' as any);
                            return packColor(color);
                        },
                    },
                    strokeColor: {
                        size: 2,
                        callback: (feature : FeatureLike) => {
                            const style = getStyle(feature)
                            const color = asArray(style?.getStroke()?.getColor() || '#eee' as any);
                            return packColor(color);
                        },
                    },
                    strokeWidth: {
                        size: 1,
                        callback: (feature : FeatureLike) => {
                            const style = getStyle(feature)
                            return style?.getStroke()?.getWidth() || 0;
                        },
                    },
                },
            },
        });
    }
}

function addUrbanDensityLayer(map: Map) {
    const urbanDensityLayer = new WebGLVectorTileLayer({
        source: new VectorTileSource({
            attributions: '',
            format: new MVT(),
            url: `${config.routingApi}mvt/{z}/{x}/{y}.mvt?render_all=true`,
        }),
        style: ((feature: Feature) => getStyle(feature)) as any,
    })
    urbanDensityLayer.set(urbanDensityLayerKey, true)
    // make sure the urban density layer is shown on top of the background layer. note that the layer order is
    // determined by both the z-index and the order of the layers in map.getLayers()
    urbanDensityLayer.setZIndex(0.6)
    map.addLayer(urbanDensityLayer)
}

function removeUrbanDensityLayer(map: Map) {
    map.getLayers()
        .getArray()
        .filter(l => l.get(urbanDensityLayerKey))
        .forEach(l => map.removeLayer(l))
}
