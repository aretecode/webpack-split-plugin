# 🤸🔌 webpack-split-plugin

> split bundle into multiple pieces with custom specifications

extension of [CommonsChunkPlugin](https://github.com/webpack/webpack/blob/cd1cd29fba46bd0133db0ca89acbe6c6c0240323/lib/optimize/CommonsChunkPlugin.js)

![output](https://user-images.githubusercontent.com/4022631/27008494-4b562c38-4e27-11e7-83a1-7cd720516b8e.gif)

### 📦 install

```bash
yarn add webpack-split-plugin --dev
npm i webpack-split-plugin --save-dev
```

```js
const WebpackSplitPlugin = require('webpack-split-plugin')

// also exported for convenience
const {CollectionManager, custom, match, version, log} = WebpackSplitPlugin
```

## [📘 example](https://github.com/aretecode/webpack-split-plugin/example-demo)

```js
plugins: [
  new WebpackSplitPlugin({
    // * required
    name: 'eh',
    filename: '[name]-split.js',

    // [optional], very verbose output
    debug: true,

    // [optional], automatically figures it out after first run
    totalSize: '1937kb', // 1.937mb
  }),
],
```

## [📘 example custom](https://github.com/aretecode/webpack-split-plugin/example-demo/webpack.config.custom.js)

```js
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
})
```


### [🔗 resources](./docs/resources.md)
### [🔬 tests](./test)
### [📖 🚧 WIP docs](./docs)
