import VectorTile from 'ol/layer/VectorTile'
import WebGLVectorTileLayerRenderer from 'ol/renderer/webgl/VectorTileLayer'
import { FeatureLike } from 'ol/Feature'
import { asArray } from 'ol/color'
import { packColor, parseLiteralStyle } from 'ol/webgl/styleparser'

const result = parseLiteralStyle({
    'fill-color': ['get', 'fillColor'],
    'stroke-color': ['get', 'strokeColor'],
    'stroke-width': ['get', 'strokeWidth'],
})

class WebGLVectorTileLayer extends VectorTile {
    readonly props: any
    constructor(props: any) {
        super(props)
        this.props = props
    }

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
                        callback: (feature: FeatureLike) => {
                            const style = this.props.style(feature)
                            const color = asArray(style?.getFill()?.getColor() || ('#eee' as any))
                            return packColor(color)
                        },
                    },
                    strokeColor: {
                        size: 2,
                        callback: (feature: FeatureLike) => {
                            const style = this.props.style(feature)
                            const color = asArray(style?.getStroke()?.getColor() || ('#eee' as any))
                            return packColor(color)
                        },
                    },
                    strokeWidth: {
                        size: 1,
                        callback: (feature: FeatureLike) => {
                            const style = this.props.style(feature)
                            return style?.getStroke()?.getWidth() || 0
                        },
                    },
                },
            },
        })
    }
}

export default WebGLVectorTileLayer
