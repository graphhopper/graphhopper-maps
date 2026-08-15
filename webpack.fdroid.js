const { merge } = require('webpack-merge')
const common = require('./webpack.common.js')

module.exports = merge(common, {
    mode: 'production',
    // The Android app bundles everything offline and expects a single bundle.js, so disable
    // code splitting (e.g. the lazily imported MapLibreLayer) for this build only.
    output: { asyncChunks: false },
    plugins: common.plugins?.filter(p => p.constructor.name !== 'FaviconsWebpackPlugin') || [],
})
