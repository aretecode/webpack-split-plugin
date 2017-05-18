var path = require('path')
var pkg = require('./package.json')
var webpack = require('webpack')
var Chunker = require('./Chunker')
var rootPath = path.resolve(__dirname, '.')
var alias = {
  src: rootPath + '/src',
}
var log = require('fliplog')

var config = {
  entry: {
    index: ['./src/index.js'],
  },
  output: {
    path: rootPath + '/disted',
    publicPath: '/build/',
    filename: '[name].js',
    libraryTarget: 'amd',
    library: 'demo',
  },
  resolve: {
    alias: alias,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
      {
        test: /\.scss|\.css/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'sass-loader',
          },
        ],
      },
    ],
  },
  externals: {},

  plugins: [
    new Chunker({
      name: 'eh',
      minChunks: 0,
      // pieces: 2,
    }),
  ],
}

module.exports = config
