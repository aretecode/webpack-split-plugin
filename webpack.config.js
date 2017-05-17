var path = require('path')
var pkg = require('./package.json')
var webpack = require('webpack')
var rootPath = path.resolve(__dirname, '.')
var alias = {
  src: rootPath + '/src',
}

var config = {
  entry: {
    "index": ["./src/index.js"],
  },
  output: {
    path: rootPath + '/dist',
    publicPath: '/build/',
    filename: '[name].js',
    libraryTarget: 'amd',
    library: 'demo',
  },
  resolve: {
    alias: alias
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      use: [{
        loader: 'babel-loader',
      }]
    }, {
      test: /\.scss|\.css/,
      use: [{
        loader: 'style-loader',
      }, {
        loader: 'sass-loader'
      }]
    }]
  },
  externals: {},

  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      "process.env": {
        NODE_ENV: JSON.stringify('production')
      },
    }),
  ]
}

module.exports = config