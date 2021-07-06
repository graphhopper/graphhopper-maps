const { mergeWithRules, CustomizeRule } = require('webpack-merge')
const webpack = require('webpack')
const path = require('path')

const common = require('./webpack.common.js')

if (!process.env.GraphHopperApiKey) {
    console.log('Missing environment variable: GraphHopperApiKey. Get one from https://graphhopper.com/dashboard')
    process.exit(-1)
}

const develop = {
    mode: 'development',
    devtool: 'source-map',
    devServer: {
        contentBase: path.resolve(__dirname, 'dist'),
        https: false,
        port: 3000,
        host: '0.0.0.0',
    },
    plugins: [
        new webpack.EnvironmentPlugin({
            GraphHopperApiKey: undefined, // use no default to throw exception if missing
            MapTilerApiKey: undefined, // use no default to throw exception if missing
            OmniscaleApiKey: "missing api key",
            ThunderforestApiKey: "missing api key",
            KurvigerApiKey: "missing api key",
        })
    ],
    module: {
        rules: [
            {
                test: /\.css$/,
                exclude: path.resolve(__dirname, 'node_modules'),
                use: [
                    {
                        loader: 'css-loader',
                        options: {
                            modules: {
                                localIdentName: '[path][name]__[local]',
                            },
                        },
                    },
                ],
            },
        ],
    },
}

const mergePattern = {
    module: {
        rules: {
            test: CustomizeRule.Match,
            exclude: CustomizeRule.Match,
            use: {
                loader: CustomizeRule.Match,
                options: CustomizeRule.Replace,
            },
        },
    },
}

module.exports = mergeWithRules(mergePattern)(common, develop)
