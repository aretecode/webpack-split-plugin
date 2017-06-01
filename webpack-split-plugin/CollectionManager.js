/**
 * @file
 *  adds files,
 *  gets total size,
 *  groups them based on limitPieces,
 *  returns result
 */

const { statSync } = require('fs')
const { resolve } = require('path')
const { exists, write, read } = require('flipfile')
const log = require('fliplog')
const FileChain = require('file-chain')
const { Chain, ChainedSet } = require('chain-able')
const { isNum, formula } = require('./deps')

/**
 * @desc loads file for collecting stats
 * @type {FileChain}
 */
const persistance = FileChain.init()
  .dir(process.cwd())
  .src('.file-collection-stats.json')
  .json()
  .load()
  .setIfNotEmpty('totalSize', 0)
  .setIfNotEmpty('files', [])
  .setIfNotEmpty('groups', {})

/**
 * @classdesc simple wrapper around files
 */
class FileCollection {
  constructor() {
    this.files = [] // persistance.get('files')
  }
  add(file) {
    this.files.push(file)
    return this
  }
  toArray() {
    return this.files
  }
  size() {
    return this.files.reduce((totalSize, file) => totalSize + file.size, 0)
  }
}

/**
 * @classdesc simple wrapper around the file, reads it, sets size
 * @prop {WebpackModule} module
 * @prop {filename} string absolute path
 * @prop {number} size bytesize @see fs.statSync
 */
class File {
  constructor(filename) {
    const stats = statSync(filename)
    this.filename = filename
    this.size = stats.size
  }
}

/**
 * @TODO
 * - [ ] add config to name output limitPieces
 * - [ ] improve debug output for which collection is being used
 * - [ ] todos in addcollection (not dynamic)
 * - [ ] callback customizer fns
 */
class CollectionManager extends Chain {
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

  /**
   *  limitPieces: 2, limitSize: 0
   * @param  {Object} [options={ limitPieces: 2 }]
   */
  constructor(options = {}) {
    super()

    const { limitSize, limitPieces } = options

    /* prettier-ignore */
    this
      .extend(['splitter'])
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

    this.spinner('splitting...')
    // const ora = log.requirePkg('ora')('spinner eh...', 'dot1')
    // log.quick(ora)
    // ora.start()
  }

  /**
   * @desc use spinner, use verbose
   * @param  {string} level
   * @return {CollectionManager} @chainable
   */
  log(level) {
    if (level === 'verbose') this.set('useVerbose', true)
    if (level === 'spinner') this.set('useSpinner', true)
    return this
  }

  /**
   * @NOTE (it could default to a specific size)
   * @throws Error when no limitSize or limitPieces are provided )
   * @return {CollectionManager} @chainable
   */
  validate() {
    if (this.get('invalid') !== 2) return this

    log
      .red(`WebpackSplitPlugin: must provide either limitSize or limitPieces`)
      .data(this.entries())
      .exit(false)
  }

  /**
   * @desc start / update spinner, output config once
   * @param  {string} text
   * @return {CollectionManager} @chainable
   */
  spinner(text) {
    let { spinner, debug, useSpinner } = this.entries()

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

    this.tap('formula', () => formula(entries))
    this.collections = new ChainedSet(this)

    const { totalSize } = entries
    const { number, size } = this.get('formula')(totalSize)

    // this.spinner('updating formula')
    log.green('updating formula').data({ number, size }).echo(this.get('debug'))

    for (let i = 0; i < number; i++) {
      this.addCollection()
    }

    return this.set('pieces', this.collections.length).validate().next()
  }

  /**
   * @see this.current
   * @desc increments current group
   *       @modifies this.current
   * @return {CollectionManager} @chainable
   */
  next() {
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
    return this
  }

  /**
   * @see FileCollection
   * @desc @modifies this.collections
   * @return {CollectionManager} @chainable
   */
  addCollection() {
    this.collections.add(new FileCollection(this))
    return this
  }

  /**
   * @desc maps collections to return Array of Collections of Files
   * @return {Array<File>}
   */
  getCollections() {
    return this.collections.values().map(_collection => _collection.toArray())
  }

  /**
   * @desc puts the file into the right group/chunk/collection
   * @example limitPieces: 2, totalSize: 1000
   *          if (currentSize > 500) return 0
   *          else return 1
   * @return {FileCollection}
   */
  getCurrentGroup() {
    // data
    const entries = this.entries()
    const { currentSize, totalSize, limitPieces, limitSize } = entries
    const { size, number } = this.get('formula')(totalSize)

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

    if (this.current && this.current.size() >= size) {
      if (this.has('spinner')) {
        const spinner = this.get('spinner')
        spinner.succeed(spinner.text)
      }
      this.delete('spinner').next()
    }

    return this.current
  }

  /**
   * @TODO should add callbacks for methods
   * @desc marked as complete, persists totalSize
   * @return {ChainedMap} @chainable
   */
  complete() {
    this.set('complete', true)
    const totalSize = this.get('totalSize')

    if (this.has('spinner')) this.get('spinner').succeed()
    log
      .blue('\ncompleted! writing')
      .verbose(10)
      .when(
        this.get('useVerbose'),
        () => log.fmtobj(this.entries()),
        () => log.data({ totalSize })
      )
      .echo(this.get('debug'))

    persistance.set('totalSize', totalSize).write()

    return this
  }

  // -------------------------- splitter here ------------------------------

  /**
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
    const { totalSize, currentSize } = this.entries()
    const filename = module.userRequest

    if (exists(filename)) {
      const file = new File(filename)
      file.module = module

      this.currentSize(file.size)

      // so if we do not have a total size,
      if (totalSize <= currentSize || totalSize === 0) {
        this.totalSize(file.size)
      }

      this.getCurrentGroup().add(file)
    }

    return this
  }
}

module.exports = CollectionManager
