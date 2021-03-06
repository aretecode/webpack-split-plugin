// https://github.com/sindresorhus/matcher/blob/master/index.js
const toArr = require('chain-able/deps/to-arr')
const kindOf = require('./kind-of')

const escapeStringRegexp = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')

// @TODO: default strings without slashes to node_modules, if that is best
const reCache = new Map()

function makeMatches(patterns, shouldNegate, beginningEnd = false) {
  return toArr(patterns).map(pattern =>
    makeRe(pattern, shouldNegate, beginningEnd)
  )
}
function makeRe(pattern, shouldNegate, beginningEnd = false) {
  const kind = kindOf(pattern)

  // @NOTE: added for function callbacks
  if (kind === 'function') {
    if (pattern.test) {
      return pattern
    } else {
      pattern.test = pattern
      return pattern
    }
  } else if (kind === 'regexp') {
    return pattern
  }

  const cacheKey = pattern + shouldNegate

  if (reCache.has(cacheKey)) {
    return reCache.get(cacheKey)
  }

  let negated = false

  if (pattern[0] === '!') {
    negated = true
    pattern = pattern.slice(1)
  }

  pattern = escapeStringRegexp(pattern).replace(/\\\*/g, '.*')

  if (negated && shouldNegate) {
    pattern = `(?!${pattern})`
  }

  let re = new RegExp(`${pattern}`, 'i')
  if (beginningEnd === true) {
    re = new RegExp(`^${pattern}$`, 'i')
  }
  re.negated = negated
  // reCache.set(cacheKey, re)

  return re
}

const matcher = (inputs, patterns) => {
  if (!(Array.isArray(inputs) && Array.isArray(patterns))) {
    throw new TypeError(
      `Expected two arrays, got ${typeof inputs} ${typeof patterns}`
    )
  }

  if (patterns.length === 0) {
    return inputs
  }

  const firstNegated = patterns[0][0] === '!'

  patterns = patterns.map(x => makeRe(x, false))

  const ret = []

  inputs.forEach(input => {
    // If first pattern is negated we include everything to match user expectation
    let matches = firstNegated

    // TODO: Figure out why tests fail when I use a for-of loop here
    for (let j = 0; j < patterns.length; j++) {
      if (patterns[j].test(input)) {
        matches = !patterns[j].negated
      }
    }

    if (matches) {
      ret.push(input)
    }
  })

  return ret
}

const isMatch = (input, pattern, negate = false) =>
  makeRe(pattern, negate).test(input)

module.exports = matcher
module.exports.isMatch = isMatch
module.exports.makeRe = makeRe
module.exports.matcher = matcher
module.exports.makeMatches = makeMatches
// module.exports.matches = matches
