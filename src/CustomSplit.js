const {Chain, FactoryChain} = require('chain-able')
const log = require('fliplog')
const kindOf = require('./deps/kind-of')
const {makeMatches, makeRe} = require('./deps/matcher')

/**
 * @param  {Function | Object | Array<Test>} fns
 * @return {Object}
 */
function makeMatchesFn(fns) {
  return fns.map(fn => {
    if (kindOf(fn) === 'function') {
      return {test: fn}
    }
    return {
      test(file) {
        return makeRe(fn).test(file.filename)
      },
    }
  })
}

/**
 * log.verbose(100).data(match, match.test).echo()
 * @param  {Object} arg test object
 * @return {Function} takes all tests, checks them all
 */
function testFactory(arg) {
  let test = arg
  const kind = kindOf(test)
  if (kind.includes('function')) {
    let testReference = test
    test = {fn: testReference}
  } else if (!kind.includes('object')) {
    let testReference = test
    test = {fn: testReference}
  }

  const fn = test.fn ? makeMatchesFn(test.fn) : false
  const filename = test.testFile ? makeMatches(test.testFile) : false
  const content = test.testContent ? makeMatches(test.testContent) : false

  // log.quick({fn, filename, content})
  return file => {
    if (fn) {
      const matched = fn.filter(match => match.test(file))
      if (matched.length) return 'fn'
    }
    if (filename) {
      const matched = filename.filter(match => match.test(file.filename))
      if (matched.length) return 'filename'
    }
    if (content) {
      const matched = content.filter(match => match.test(file.content))
      if (matched.length) return 'content'
    }
    return false
  }
}

function customFactory(custom) {
  return {
    override: {
      getCurrentGroup(splitter) {
        return splitter.current
      },
      setup(splitter) {
        console.log('setup...')
        custom.splits.map(split => splitter.addGroupIfEmpty(split.name))
        return splitter
      },
      handle(file, splitter) {
        for (var split of custom.splits) {
          const {name, onMatch, test} = split
          const reason = test(file)
          const colorFile = log.chalk().underline(file.filename)
          if (reason) {
            log
              .bold(name)
              .data(' matched because: ' + reason + ' ' + colorFile)
              .echo(false)

            if (onMatch) {
              onMatch.call(splitter, file, splitter, reason)
            } else {
              splitter.setCurrent(name).getCurrentGroup().add(file)
            }
            break
          } else {
            log.red(name).data(' did not match ' + colorFile).echo(false)
          }
        }

        return splitter
      },
    },
  }
}

// @TODO: alias match as test
class CustomSplit extends Chain {
  constructor(parent) {
    super(parent)
    this.splits = []
    this.split = this.split.bind(this)
  }
  static splits(obj) {
    const custom = new CustomSplit()
    Object.keys(obj).forEach(key => custom.split(key).test(obj[key]).end())
    return custom
  }
  static split(args = null) {
    return new CustomSplit().split(args)
  }

  /**
   * @desc pass string for name, then factory chain
   *       or use object syntax passing in test, filetest, name, onMatch
   * @param  {Object | null} [args=null]
   * @return {CustomSplit} @chainable
   */
  split(args = null) {
    const split = new FactoryChain(this)

    const chain = split
      .prop('test')
      .prop('name')
      .prop('onMatch')
      .chainUpDown(this.split)
      .chainUpDowns(['split'])
      .onDone(data => {
        let {test, name, onMatch} = data

        // data transforms
        if (!test) {
          throw new Error('must provide a .test')
        }

        // extract, transform for use in splitter
        const customSplit = {
          test: testFactory(test),
          onMatch,
          name,
        }

        this.splits.push(customSplit)
        return this
      })

    // check the type of argument
    const kind = kindOf(args)
    if (kind === 'object') {
      const {test, name, onMatch} = args

      chain.name(name).test(test).onMatch(onMatch)
      if (test && name && onMatch) {
        chain.done()
        this.splits.push(chain)
        return this
      }
    } else if (kind === 'string') {
      return chain.name(args)
    }

    return chain
  }
}

module.exports = CustomSplit
module.exports.CustomSplit = CustomSplit
module.exports.customFactory = customFactory
module.exports.testFactory = testFactory
