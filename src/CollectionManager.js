/**
 * @file
 *  adds files,
 *  gets total size,
 *  groups them based on limitPieces,
 *  returns result
 */

const {resolve} = require('path')
const log = require('fliplog')
const {Chain, ChainedSet, traverse} = require('./deps')
const {isNum, formula, sizeof} = require('./deps')
const {File, FileCollection, persistance} = require('./Files')
const {CustomSplit, testFactory, customFactory} = require('./CustomSplit')
const cleanChunks = require('./deps/clean-chunks')

/**
 * @classdesc splitter chain is the instance chain
 *   -----
 *   data:
 *    collections: Set()
 *
 *   config:
 *   - totalSize
 *   - currentSize
 *   - updateFormula
 *
 *   util:
 *   - log
 *   - validate
 *   - spinner
 *
 *   lifecycle:
 *   - next
 *   - addCollection
 *   - getCollections
 *   - getCurrentGroup
 *   - handle
 *   - complete
 *
 * ------
 *
 * @TODO
 * - [ ] add config to name output limitPieces
 * - [ ] callback customizer fns
 * - [ ] put all default formula functionality as an external customizer
 */
class CollectionManager extends Chain {
  /**
   *  limitPieces: 2, limitSize: 0
   * @param  {Object} [options={ limitPieces: 2 }]
   */
  constructor(parent) {
    super(parent)

    // @TODO: update this
    const options = {}
    const {limitSize, limitPieces} = options

    /* prettier-ignore */
    this
      // .extend(['custom'])
      .extendWith(['passthrough'], true)
      .extendAddition(['totalSize', 'currentSize'])
      .extendIncrement(['group', 'invalid'])
      .extendGetSet(['formula'])
      .defineGetSet(['formula'])
      .typed('limitPieces')
        .type(isNum)
        .onInvalid(() => this.invalid())
        .end()
      .typed('limitSize')
        .type(isNum)
        .onInvalid(() => this.invalid())
        .end()

    /* prettier-ignore */
    this
      .totalSize(persistance.get('totalSize') || 0)
      .set('complete', false)
      .when(limitSize, () => this.limitSize(limitSize))
      .when(limitPieces, () => this.limitPieces(limitPieces))
      .set('group', -1) // since we use .next to go to 0 to start

    this.log = () => log
    this.echo = text => this.spinner(text)
    this.addGroup = group =>
      group ? this.addCollection(group) : this.addCollection()

    this.spinner('splitting...')
  }

  custom(custom) {
    if (custom instanceof CustomSplit) {
      return this.set('custom', customFactory(custom)).setup()
    } else {
      return this.set('custom', custom)
    }
  }

  /**
   * @event setup
   * @desc @modifies this.setup, this.collections
   * @return {CollectionManager} @chainable
   */
  setup() {
    if (this.has('setup')) return this
    this.collections = new ChainedSet(this)
    this.set('setup', true)
    if (this.has('custom.override.setup')) {
      return this.get('custom.override.setup').call(this, this)
    }
    return this
  }

  /**
   * @desc use spinner, use verbose
   * @param  {string} level
   * @return {CollectionManager} @chainable
   */
  loglevel(level) {
    if (level === 'verbose') this.set('useVerbose', true)
    if (level === 'spinner') this.set('useSpinner', true)
    return this
  }

  /**
   * @event .validate
   * @NOTE (it could default to a specific size)
   * @throws Error when no limitSize or limitPieces are provided )
   * @return {CollectionManager} @chainable
   */
  validate() {
    const hasOverride = this.has('custom.override.validate')
    const hasEvent = this.has('custom.event.validate')
    const hasCustom = this.has('custom')

    if (hasOverride) {
      return this.get('custom.override.validate').call(this, this)
    }
    if (hasEvent) {
      this.get('custom.event.validate').call(this, this)
    }

    if (this.get('invalid') !== 2 || hasCustom) {
      return this
    }
    return log
      .red(`WebpackSplitPlugin: must provide either limitSize or limitPieces`)
      .data(this.entries())
      .exit(false)
  }

  /**
   * @alias echo
   * @desc start / update spinner, output config once
   * @param  {string} text
   * @return {CollectionManager} @chainable
   */
  spinner(text) {
    let {spinner, debug, useSpinner} = this.entries()

    if (!this.outputConfig) {
      setTimeout(() => log.fmtobj(this.entries()).bold('config:').echo(), 10)
    }
    this.outputConfig = true

    if (!useSpinner) {
      if (debug) {
        console.log(text)
      }
      return this
    }

    /* prettier-ignore */
    if (!spinner) {
      this.set('spinner', log.requirePkg('ora')(text))
      this.get('spinner').start(text)
    }

    this.get('spinner').text = text

    return this
  }

  // -------------------------- splitter HERE ----------
  updateFormula() {
    const entries = this.entries()

    if (this.has('custom')) {
      this.log().underline('using custom formula').data('\n\n').echo()
      return this
    }
    this.setup()

    this.tap('formula', () => formula(entries))

    const {totalSize} = entries
    const {number, size} = this.get('formula')(totalSize)

    // this.spinner('updating formula')
    log.green('updating formula').data({number, size}).echo(this.get('debug'))

    for (let i = 0; i < number; i++) {
      this.addCollection()
    }

    return this.set('pieces', this.collections.length).validate().next()
  }

  /**
   * @event .next
   * @see this.current
   * @desc increments current group
   *       @modifies this.current
   * @return {CollectionManager} @chainable
   */
  next() {
    if (this.has('custom.override.next')) {
      return this.get('custom.override.next').call(this, this)
    }

    let group = this.tap('group', num => num + 1).get('group')
    const collections = this.collections.values()

    this.spinner(`next... ${group}`)
    // log.dim(`next... ${group}`).echo(this.get('debug'))

    /**
     * ⛑ safety:
     * - has current, has group, has collections
     * - is current group an overflow?
     *  - decrement
     */
    if (group) {
      while (!collections[group] && group > 0) {
        group = this.tap('group', num => num - 1).get('group')
        this.spinner(`⛑ decrementing group ${group}`)
      }
    }

    this.current = collections[group]

    if (this.has('custom.event.next')) {
      this.get('custom.event.next').call(this, this)
    }

    return this
  }

  /**
   * @see FileCollection
   * @desc @modifies this.collections
   * @param {FileCollection} group
   * @param {string | null} name
   * @return {CollectionManager} @chainable
   */
  addCollection(group = new FileCollection(this), name = null) {
    this.collections.add(group)
    // store for later
    if (name && this.has(name) === false) {
      this.set(name, group)
    }

    return this
  }

  /**
   * @since 0.3.0
   * @desc expressive for [v]
   * @see      .addCollection
   * @param {string} name
   * @return {SplitPlugin} @chainable
   */
  addGroupIfEmpty(name) {
    if (!this.parent.chunkNames.includes(name)) {
      this.parent.chunkNames.push(name)
    }

    if (this.has(name) === false) {
      log.underline('adding new group').data(name).echo(this.get('debug'))
      return this.addCollection(new FileCollection(this), name)
    }

    // log was empty
    return this
  }

  /**
   * @since 0.3.0
   * @param {string | Set} name
   * @return {SplitPlugin} @chainable
   */
  setCurrent(name) {
    log.dim('setting current').data(name).echo(false)

    this.current = typeof name === 'string'
      ? this.get(name)
      : name || this.current
    return this
  }

  /**
   * @since 0.3.0
   * @desc maps collections to return Array of Collections of Files
   * @return {Array<File>}
   */
  getCollections() {
    return this.collections.values().map(_collection => _collection.toArray())
  }

  /**
   * @event .getCurrentGroup
   * @desc puts the file into the right group/chunk/collection
   * @example limitPieces: 2, totalSize: 1000
   *          if (currentSize > 500) return 0
   *          else return 1
   * @return {FileCollection}
   */
  getCurrentGroup() {
    if (this.has('custom.override.getCurrentGroup')) {
      return this.get('custom.override.getCurrentGroup').call(this, this)
    }
    // safety
    if (!this.current) {
      this.next()
    }

    // add empty collection if calling next did not have a real value
    if (!this.current) {
      // this.spinner('\nusing passthrough, have to do a dry run for total size\n')
      log
        .color('bold.underline')
        .text('\nusing passthrough, have to do a dry run for total size\n')
        .echo() // this.get('debug')

      return this.addCollection().passthrough().next().current
    }

    // data
    const entries = this.entries()
    const {currentSize, totalSize, limitPieces, limitSize} = entries
    const {size, number} = this.get('formula')(totalSize)

    const chalk = log.chalk()
    const currentC = chalk.bold(this.current ? this.current.size() : 0)
    const formulaC = chalk.dim(size)
    const totalC = chalk.dim(totalSize)
    const groupC = chalk.blue(this.get('group'))
    let text = `current: ${currentC}, `
    text += `formula: ${formulaC}, total: ${totalC} `
    text += `group: ${groupC}`
    this.spinner(text)

    log
      .data({
        formula: {
          size,
          number,
        },
        currentSize,
        totalSize,
        limitPieces,
        currentGroupSize: this.current ? this.current.size() : 0,
        group: this.get('group'),
      })
      .echo(!!this.get('useVerbose'))

    if (this.current.size() >= size) {
      if (this.has('spinner')) {
        const spinner = this.get('spinner')
        spinner.succeed(spinner.text)
      }
      this.delete('spinner').next()
    }

    if (this.has('custom.event.getCurrentGroup')) {
      this.get('custom.event.getCurrentGroup').call(this, this)
    }

    return this.current
  }

  /**
   * @event .complete
   * @TODO should add callbacks for methods
   * @desc marked as complete, persists totalSize
   * @return {ChainedMap} @chainable
   */
  complete() {
    log.blue('\ncompleted!').echo()

    // for debugging
    // log.verbose(3).data(this.collections, this.parent.chunkNames).exit()
    // cleanChunks(this.collections)

    if (this.has('custom.override.complete')) {
      return this.get('custom.override.complete').call(this, this)
    }

    // --- @TODO: custom.default.complete
    this.set('complete', true)
    const totalSize = this.get('totalSize')

    if (this.has('spinner')) this.get('spinner').succeed()
    log
      .blue('\ncompleted! writing')
      .verbose(10)
      .when(
        this.get('useVerbose'),
        () => log.fmtobj(this.entries()),
        () => log.data({totalSize})
      )
      .echo(this.get('debug'))

    persistance.set('totalSize', totalSize).write()
    // --- ;

    if (this.has('custom.event.complete')) {
      this.get('custom.event.complete').call(this, this)
    }

    return this
  }

  // -------------------------- splitter here ------------------------------

  /**
   * @event .handle
   * @NOTE   this originally was module.userRequest (absolute file path)
   *         but keeping reference to the module here is better/simpler
   * @desc   handles a modile
   *         - checks if the file exists
   *         - @modifies totalSize, currentSize (adds file size)
   *         - uses calculation in this.getCurrentGroup to use correct group
   * @param  {WebpackModule} module
   * @return {ChainedMap} @chainable
   */
  handle(module) {
    const filename = module.userRequest

    if (this.has('custom.event.preHandle')) {
      this.get('custom.event.preHandle').call(this, this)
    }

    const file = new File(filename)
    if (file.exists()) {
      file.module = module

      // could add a group here
      if (this.has('custom.override.handle')) {
        return this.get('custom.override.handle')(file, this)
      }

      // --- @TODO: custom.default.handle
      const {totalSize, currentSize} = this.entries()
      this.currentSize(file.size)

      // so if we do not have a total size,
      if (totalSize <= currentSize || totalSize === 0) {
        this.totalSize(file.size)
      }

      this.getCurrentGroup().add(file)
      // --- ;
    }

    if (this.has('custom.event.postHandle')) {
      this.get('custom.event.postHandle').call(this, this)
    }

    return this
  }
}

module.exports = CollectionManager
