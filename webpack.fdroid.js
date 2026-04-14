const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
    mode: 'production',
    plugins: common.plugins?.filter(p => p.constructor.name !== 'FaviconsWebpackPlugin') || [],
})