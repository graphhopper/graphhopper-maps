const { merge } = require('webpack-merge')
const path = require('path')

const common = require('./webpack.common.js')

const config = merge(common, {
    mode: 'development',
    devtool: 'source-map',
    devServer: {
        contentBase: path.resolve(__dirname, 'dist'),
        https: false,
        port: 3000,
        host: '0.0.0.0',
    },
})

config.module.rules[3].use[1].options.modules = {
    localIdentName: '[path][name]__[local]'
}

module.exports = config