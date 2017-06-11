// https://stackoverflow.com/questions/40512393/understanding-string-heap-size-in-javascript-v8
// https://stackoverflow.com/questions/26856783/size-of-a-function-in-memory
// https://hashnode.com/post/what-is-the-best-way-to-calculate-the-size-of-a-json-object-in-nodejs-cinklya0f00670d53c0puzb2u
// https://bclary.com/2004/11/07/#a-4.3.16
// http://www.ecma-international.org/ecma-262/5.1/
// https://github.com/miktam/sizeof/blob/master/byte_size.js
// https://github.com/calebsander/structure-bytes
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures
// https://github.com/substack/utf8-length/blob/master/index.js
const ECMA_SIZES = {
  _STRING: 2,
  _BOOLEAN: 4,
  _NUMBER: 8,
  _NULL: 4,
  _UNDEFINED: 9,
  _FUNCTION: 1,
  _DATE: 1, // string
}
const { Buffer } = require('buffer')
const { traverse } = require('chain-able')
const kindOf = require('./kind-of')

function sizeof(obj) {
  let size = 0
  traverse(obj).forEach(function(x) {
    const value = this.value || x
    switch (kindOf(value)) {
      case 'buffer':
        size += value.length
        break
      case 'string':
        size += value.length * ECMA_SIZES._STRING
        break
      case 'boolean':
        size += ECMA_SIZES._BOOLEAN
        break
      case 'number':
        size += ECMA_SIZES._NUMBER
        break
      case 'function':
      case 'date':
        size += value.toString().length * ECMA_SIZES._STRING
        break
      case 'undefined':
      case 'null':
        size += ECMA_SIZES._UNDEFINED
        break
      default:
        try {
          const stringified = JSON.stringify(value)
          size += ~-encodeURI(stringified).split(/%..|./).length
        } catch (e) {
          break
        }
        break
    }
  })
  return size
}

module.exports = sizeof
