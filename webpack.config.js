var path = require('path');


module.exports = {
    entry: {
        'index': './module/index.js'
    },

    externals: {
        'ContentTools': 'ContentTools',
        'content-flow': 'content-flow',
        'manhattan-assets': 'manhattan-assets',
        'manhattan-essentials': 'manhattan-essentials'
    },

    output: {
        library: 'manhattan-content',
        libraryTarget: 'umd',
        path: path.resolve(__dirname, 'umd'),
        filename: '[name].js'
    },

    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                query: {
                    presets: ['es2015'],
                    plugins: [
                        [
                            'babel-plugin-transform-builtin-extend',
                            {
                                globals: ['Error']
                            }
                        ]
                    ]
                }
            }
        ]
    },

    stats: {
        colors: true
    }
}
