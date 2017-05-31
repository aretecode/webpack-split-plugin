var path = require('path')
var pkg = require('./package.json')
var webpack = require('webpack')
var log = require('fliplog')
var HtmlWebpackPlugin = require('webpack-html-plugin')
var WebpackSplitPlugin = require('./webpack-split-plugin')

var rootPath = path.resolve(__dirname, '.')
var alias = {
  src: rootPath + '/src',
}

var config = {
  cache: false,
  entry: {
    index: ['./src/index.js'],
  },
  output: {
    path: rootPath + '/demo',
    publicPath: './',
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

        // @NOTE: included node_modules and target uglify to minify with es6
        // but it really should use babili instead,
        // but this is a simple example so
        //
        // exclude: /node_modules/,

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
            loader: 'css-loader',
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
    new WebpackSplitPlugin({
      debug: true,
      name: 'eh',
      filename: '[name]-split.js',

      // optional, figures it out after first run, needs to go in docs
      // totalSize: '1937kb', // 1.937mb
    }),

    // no need to use this currently, but can be helpful (when cache is off)
    // new HtmlWebpackPlugin(),
  ],
}

module.exports = config
