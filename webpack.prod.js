const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

const FaviconsWebpackPlugin = require('favicons-webpack-plugin')
common.plugins.push(new FaviconsWebpackPlugin({
            logo: './src/logo.svg',
            favicons: {
                icons: { appleStartup: false, yandex: false, coast: false }
            }
       }))

module.exports = merge(common, {
    mode: 'production',
})
