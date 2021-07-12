const path = require('path')
const webpack = require('webpack')

const HTMLWebpackPlugin = require('html-webpack-plugin')
const FaviconsWebpackPlugin = require('favicons-webpack-plugin')

const apikeys = require('./apikeys.js')

if (!apikeys.graphhopper) {
    const emptyApiKeys = {
       "graphhopper": "missing api key",
       "maptiler": "missing api key",
       "omniscale": "missing api key",
       "thunderforest": "missing api key",
       "kurviger": "missing api key",
    }

    console.log('Missing apikeys.js file or missing graphhopper key inside this file. Get it from https://graphhopper.com/dashboard')
    console.log('Then create the file with:')
    console.log('module.exports=' + JSON.stringify(emptyApiKeys))
    process.exit(-1)
} else {
    // console.log('module.exports=' + JSON.stringify(apikeys))
}

module.exports = {
    entry: path.resolve(__dirname, 'src', 'index.tsx'),
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
        extensions: ['.ts', '.tsx', '.js', '.json', '.css', '.svg'],
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: 'awesome-typescript-loader' },
            {
                enforce: 'pre',
                test: /\.js$/,
                loader: 'source-map-loader',
                // exclude react responsive module because it would cause build warnings. They say they've solved this issue with 9.0.0 but doesn't look like it
                // excluding it from source maps for now. See also https://github.com/contra/react-responsive/issues/226
                exclude: path.resolve(__dirname, 'node_modules', 'react-responsive'),
            },
            // load styles from node_modules but leave them un-touched
            // this is important for mapbox-gl
            {
                test: /\.css$/,
                include: path.resolve(__dirname, 'node_modules'),
                exclude: path.resolve(__dirname, 'src'),
                use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
            },
            // load styles from sources and apply css modules to them
            {
                test: /\.css$/,
                exclude: path.resolve(__dirname, 'node_modules'),
                use: [
                    { loader: 'style-loader' },
                    {
                        loader: 'css-loader',
                        options: {
                            modules: true,
                        },
                    },
                ],
            },
            // this loader inlines svg images as react components
            {
                test: /\.svg$/,
                exclude: path.resolve(__dirname, 'node_modules/leaflet.heightgraph'),
                use: ['@svgr/webpack'],
            },
            // heightgraph.css loads svg files using url(), so we need to add them as asset modules
            {
                test: /\.svg$/,
                include: path.resolve(__dirname, 'node_modules/leaflet.heightgraph'),
                type: 'asset',
            },
            {
                test: /\.png$/i,
                type: 'asset',
            },
        ],
    },
    plugins: [
        new HTMLWebpackPlugin({ template: path.resolve(__dirname, 'src/index.html') }),
        new FaviconsWebpackPlugin(path.resolve(__dirname, 'src/favicon.png')),
        new webpack.EnvironmentPlugin({
            GraphHopperApiKey: apikeys.graphhopper, // use no default to throw exception if missing
            MapTilerApiKey: apikeys.maptiler, // use no default to throw exception if missing
            OmniscaleApiKey: apikeys.omniscale,
            ThunderforestApiKey: apikeys.thunderforest,
            KurvigerApiKey: apikeys.kurviger,
        })
    ],

    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.

    // maybe use this later, but with HTMLWebpackPlugin it is easier without
    /*  externals: {
          "react": "React",
          "react-dom": "ReactDOM"
      }
      */
}
