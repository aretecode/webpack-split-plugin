const traverse = require('./traverse')
const log = require('fliplog')
const ChainedMap = require('chain-able/ChainedMapExtendable')
const clone = require('lodash.clonedeep')

class Cleaner extends ChainedMap {
  static init(obj) {
    return new Cleaner().obj(obj).onMatch()
  }
  obj(obj = null) {
    if (!obj) return this
    return this.set('obj', clone(obj))
  }
  keys(tests) {
    return this.set('keys', tests)
  }
  vals(tests) {
    return this.set('vals', tests)
  }
  onMatch(cb = null) {
    if (cb === null) {
      cb = arg => {
        const { val, prop, obj, keys, i, len } = arg
        delete obj[prop]
      }
    }

    return this.set('onMatch', cb)
  }

  clean() {
    const debug = this.get('debug')
    const { obj, keys, vals, onMatch } = this.entries()
    log.bold('key val matchers').fmtobj({ keys, vals }).echo(debug)

    // debug this
    const matcher = (prop, val) => {
      if (keys) {
        for (var test of keys) {
          log
            .dim('testing keys')
            .data({ test, prop, matched: test.test(prop) })
            .echo(debug)

          if (test.test(prop)) {
            log.green('matched!').echo(debug)
            return true
          }
        }
      }

      if (vals) {
        for (var test of vals) {
          log
            .dim('testing vals')
            .data({ test, val, matched: test.test(val) })
            .echo(debug)
          if (test.test(val)) {
            log.green('matched!').echo(debug)
            return true
          }
        }
      }

      log.red('did not match').fmtobj({ prop, val }).echo(debug)
      return false
    }

    traverse(obj).forEach(function(x) {
      // require('fliplog').data({ x }).bold(this.key).echo()
      // if (x && x.parser) this.remove()
      if (matcher(this.key, x)) {
        // require('fliplog').data({ x }).bold(this.key).echo()
        this.remove()
      } else {
        // require('fliplog').data({ x }).red(this.key).echo()
      }
    })

    return obj
  }
}

module.exports = Cleaner
