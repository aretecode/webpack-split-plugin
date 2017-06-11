const {statSync} = require('fs')
const {exists, write, read} = require('flipfile')
const FileChain = require('file-chain')

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

// ------ file --------

/**
 * @classdesc simple wrapper around the file, reads it, sets size
 * @prop {WebpackModule} module
 * @prop {filename} string absolute path
 * @prop {number} size bytesize @see fs.statSync
 */
class File {
  constructor(filename) {
    this.filename = filename
  }
  get stats() {
    this._stats = this._state || statSync(this.filename)
    return this._stats
  }
  get size() {
    return this.stats.size
  }
  get content() {
    return this.read()
  }
  read() {
    return read(this.filename)
  }
  write(content) {
    return write(this.filename, content)
  }
  exists() {
    return exists(this.filename)
  }
}

module.exports = {
  File,
  FileCollection,
  FileChain,
  persistance,
  statSync,
  exists,
  write,
  read,
}
