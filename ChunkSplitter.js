/**
 * @file
 *  adds files,
 *  gets total size,
 *  groups them based on pieces,
 *  returns result
 */

const { statSync } = require('fs')
const { resolve } = require('path')
const { exists, write, read } = require('flipfile')
const log = require('fliplog')
const FileChain = require('file-chain')
const ChainedMap = require('chain-able/ChainedMapExtendable')
const ChainedSet = require('chain-able/ChainedSet')

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
 * - [ ] add config to name output pieces
 * - [ ] improve debug output for which collection is being used
 * - [ ] todos in addcollection (not dynamic)
 */
class CollectionManager extends ChainedMap {
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
   * @param  {Object} [options={ pieces: 2 }]
   */
  constructor(options = { pieces: 2 }) {
    super()
    /* prettier-ignore */
    this
      .extend(['pieces', 'group'])
      .extendAddition(['totalSize', 'currentSize'])
      .totalSize(persistance.get('totalSize'))
      .set('complete', false)
      .debug(true)
      .pieces(options.pieces) // can do from
      .group(0)

    this.collections = new ChainedSet(this)

    // @FIXME right now, hardcoded as 2 pieces
    this.addCollection().addCollection()
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
   * @example pieces: 2, totalSize: 1000
   *          if (currentSize > 500) return 0
   *          else return 1
   * @return {FileCollection}
   */
  getCollection() {
    const { currentSize, totalSize, pieces } = this.entries()

    const sizeAsPieces = totalSize / pieces

    log.data({ sizeAsPieces, totalSize, pieces }).echo(false)

    if (currentSize > sizeAsPieces) {
      log.cyan('using collection 1').echo(this.get('debug'))
      return this.collections.values()[1]
    }

    log.cyan('using collection 0').echo(this.get('debug'))
    return this.collections.values()[0]
  }

  /**
   * @TODO should add callbacks for methods
   * @desc marked as complete, persists totalSize
   * @return {ChainedMap} @chainable
   */
  complete() {
    this.set('complete', true)
    const collection = this.get('collection')
    const totalSize = this.get('totalSize')

    log
      .blue('completed! writing')
      .verbose(10)
      .data({ totalSize })
      .echo(this.get('debug'))

    persistance.set('totalSize', totalSize).write()

    return this
  }

  /**
   * @NOTE   this originally was module.userRequest (absolute file path)
   *         but keeping reference to the module here is better/simpler
   * @desc   handles a modile
   *         - checks if the file exists
   *         - @modifies totalSize, currentSize (adds file size)
   *         - uses calculation in this.getCollection to use correct group
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

      this.getCollection().add(file)
    }

    return this
  }
}

module.exports = CollectionManager
