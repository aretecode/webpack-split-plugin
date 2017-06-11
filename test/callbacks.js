const test = require('ava')
const WebpackSplitPlugin = require('../index')

test.failing('custom.events - are all called', t => {})
test.only('custom.overrides - are all called', t => {
  const custom = {
    // use this functionality instead
    override: {
      next() {},
      getCurrentGroup() {
        return cssGroup
      },

      // start() {},
      // done() {},
    },
    // call this when events happen

    events: {
      handle(data, splitter) {
        if (data.filename.includes('css')) {
          // debugger
          splitter.addGroup()
        }
      },
    },
  }

  new WebpackSplitPlugin({
    debug: 'spinner',
    name: 'eh',
    filename: '[name]-split.js',
    custom,
    // limitPieces,
    // limitSize,
    // optional, figures it out after first run, needs to go in docs
    // totalSize: '1937kb', // 1.937mb
  })
})
