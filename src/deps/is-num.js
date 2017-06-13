module.exports = function isNum(x) {
  if (typeof x === 'number') return true
  if (/^0x[0-9a-f]+$/i.test(x) === true) return true
  return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x)
}
