const test = require('ava')
const WebpackSplitPlugin = require('../index')

test('basic - can instantiate', t => {
  const plugin = new WebpackSplitPlugin({
    // * required
    name: 'eh',
    filename: '[name]-split.js',

    // [optional], very verbose output
    debug: true,

    // [optional], automatically figures it out after first run
    totalSize: '1937kb', // 1.937mb
  })

  t.true(plugin instanceof WebpackSplitPlugin)
})
