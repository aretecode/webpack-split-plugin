const {Chain, ChainedSet, traverse} = require('chain-able')
const dot = require('chain-able/deps/dot-prop')
const isDot = k => typeof k === 'string' && k.includes('.')
const matcher = require('./matcher')

class Chains extends Chain {
  end(level) {
    let parent = this.parent
    if (level === Infinity) {
      while (parent.parent) {
        parent = parent.parent
      }
    }
    return parent
  }

  // @NOTE: this is in chain-able just not released on stable
  set(key, val) {
    return isDot(key)
      ? super.set(
          key.split('.').shift(),
          dot.set(super.entries(this), key, val) || val
        )
      : super.set(key, val)
  }
  get(key) {
    return isDot(key) ? dot.get(super.entries(this), key) : super.get(key)
  }
  has(key) {
    return isDot(key) ? dot.has(super.entries(this), key) : super.has(key)
  }
  delete(key) {
    return isDot(key) ? dot.delete(super.entries(this), key) : super.delete(key)
  }

  /**
   * @inheritdoc
   * @desc   extends prop to add on every call
   * @see    ChainedMap.extend
   * @param  {Array<string>} methods
   * @return {CollectionManager} @chainable
   */
  extendAddition(methods) {
    methods.forEach(method => {
      this.set(method, 0)
      // could be typed too ^w^
      this[method] = number => this.set(method, this.get(method) + number)
    })
    return this
  }
}

// @TODO: chain-wrap in matcher
class MatchChain extends Chain {
  constructor(parent) {
    super(parent)
    this.extend(['input', 'pattern', 'any', 'negate'])
    this.test = this.isMatch.bind(this)
  }

  static init(parent) {
    return new MatchChain(parent)
  }
  static input(input) {
    return MatchChain.init().input(input)
  }
  static pattern(pattern) {
    return MatchChain.init().pattern(pattern)
  }
  static any(any) {
    return MatchChain.init().any(any)
  }
  static negate(negate) {
    return MatchChain.init().negate(negate)
  }
  isMatch(data = null) {
    let {input, pattern, any, all, negate} = this.entries()
    if (data) input = data
    if (!Array.isArray(input)) input = [input]
    if (!Array.isArray(pattern)) pattern = [pattern]
    const patterns = pattern.map(p => matcher.makeRe(p))

    // match everything against everything, then flatten
    const patternsMatch = x => patterns.map(regex => regex.test(x))
    const arrays = input.map(x => patternsMatch(x))
    const results = [].concat.apply([], arrays)

    if (this.get('debug')) {
      console.log({input, patterns, any, all, negate, results})
    }

    if (any === true) return results.some(true)
    return results.filter(x => x === true).length === pattern.length
  }
}
module.exports = Chains
module.exports.dot = dot
module.exports.isDot = isDot
module.exports.ChainedSet = ChainedSet
module.exports.Chain = Chains
module.exports.traverse = traverse
module.exports.MatchChain = MatchChain
