# 🤸🔌 webpack-split-plugin

> split bundle into multiple pieces with custom specifications
> _(currently hard coded as 1/2 the size)_

extension of [CommonsChunkPlugin](https://github.com/webpack/webpack/blob/cd1cd29fba46bd0133db0ca89acbe6c6c0240323/lib/optimize/CommonsChunkPlugin.js)

## 📦 install
```bash
yarn add webpack-split-plugin --dev
npm i webpack-split-plugin --save-dev
```

```js
const WebpackSplitPlugin = require('webpack-split-plugin')
```

# [📘 example](https://github.com/aretecode/webpack-split-plugin)

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

### [🔗 resources](./resources.md)
### [🔬 tests](./test)

### 🚧 work-in-progress

> more coming soon with stability & customizability.
