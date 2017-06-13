var path = require('path')
var pkg = require('./package.json')
var webpack = require('webpack')
var log = require('fliplog')
var HtmlWebpackPlugin = require('webpack-html-plugin')
var ExtractTextPlugin = require('extract-text-webpack-plugin')
var WebpackSplitPlugin = require('../src/index.js')

var {custom, match} = WebpackSplitPlugin
var rootPath = path.resolve(__dirname, '.')
var alias = {
  src: rootPath + '/src',
}

var echo = false

// @NOTE: usage as an object, unused
// @TODO: it should allow adding  groups inside of the conditionals
//        instead of at the beginning
const customObj = {
  // use this functionality instead
  override: {
    next() {},
    getCurrentGroup(splitter) {
      return splitter.current
    },
    handle(file, splitter) {
      // splitter.group()
      // -> name
      splitter.addGroupIfEmpty('css')
      splitter.addGroupIfEmpty('babs')
      splitter.addGroupIfEmpty('js')
      splitter.addGroupIfEmpty('material')
      const content = file.content

      const isStyle =
        (/css|sass|scss/).test(file.filename) || content.includes('yellow')
      const isBabel = (/babel/).test(file.filename)
      // const isMaterial = matcher([file.filename], ['material-*'])
      // const isMaterial = matcher.isMatch(file.filename, 'material-*')
      // const material = matcher.makeRe('material-*')
      // const match = material.test(file.filename)

      const isMaterial = match
        .input(file.filename)
        .pattern('material-*')
        .isMatch()

      // log.bold(material.toString()).data({ match, file: file.filename }).echo()

      if (isMaterial) {
        log.yellow('IS material ' + file.filename).data().echo()
        splitter.setCurrent('material')
      } else if (isStyle) {
        log
          .magenta('IS styles ' + file.filename)
          .data(file.filename.includes('css'))
          .echo(echo)

        splitter.setCurrent('css')
        // splitter.setCurrent(groups.css)
      } else if (isBabel) {
        log
          .bold('IS BABS ' + file.filename)
          .data(file.filename.includes('css'))
          .echo(echo)

        splitter.setCurrent('babs') // groups.babs
      } else {
        log
          .cyan('js... ' + file.filename)
          .data(file.filename.includes('css'))
          .echo(echo)

        // splitter.addGroupIfEmpty('js')
        // splitter.current = splitter.get('js')

        splitter.setCurrent('js') // groups.js
        // splitter.tap('group', group => 2)
        // splitter.group()
      }

      splitter.getCurrentGroup().add(file)
      return splitter
    },
    // start() {},
    // done() {},
  },
  // call this when events happen
  events: {},
}
// ----------

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
    alias,
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
    new ExtractTextPlugin({
      filename: '[name].css',
      allChunks: true,
    }),
    new WebpackSplitPlugin({
      debug: 'verbose',
      filename: '[name]-split.js',
      custom: custom.splits({
        // order of specificity
        eh: ['moment'],
        react: ['react'],
        moose: [/noop/],
        igloo: [file => (/plx/).test(file)],
        canada: ['src/*.js'],
      }),
      // @NOTE: can be done more verbosely as well
      //        the above simply creates the below in a factory
      // custom: custom
      //   .split('css')
      //   .test(['css*'])
      //   .onMatch((file, splitter) => {
      //     splitter.setCurrent('css').getCurrentGroup().add(file)
      //   })
      //   .split('material')
      //   .test(['material-*'])
      //   .onMatch((file, splitter) => {
      //     splitter.setCurrent('material').getCurrentGroup().add(file)
      //   })
      //   .split('vendor')
      //   .test([/react/, x => x.filename.includes('node_modules')])
      //   .onMatch((file, splitter) => {
      //     splitter.setCurrent('vendor').getCurrentGroup().add(file)
      //   })
      //   // no callback will do what is done in the above ^
      //   .split('js')
      //   .test(['*.js'])
      //   .end(),
    }),

    // no need to use this currently, but can be helpful (when cache is off)
    // new HtmlWebpackPlugin(),
  ],
}

module.exports = config
