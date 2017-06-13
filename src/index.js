const WebpackSplitPlugin = require('./WebpackSplitPlugin')
module.exports = WebpackSplitPlugin
module.exports.WebpackSplitPlugin = WebpackSplitPlugin
module.exports.CollectionManager = require('./CollectionManager')
module.exports.Files = require('./Files')
module.exports.version = require('../package.json').version
module.exports.log = require('fliplog')
module.exports.custom = require('./CustomSplit')
module.exports.deps = require('./deps')

module.exports.match = module.exports.deps.Chain.MatchChain
module.exports = Object.assign(module.exports, module.exports.deps)
