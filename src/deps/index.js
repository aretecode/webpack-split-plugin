const formula = require('./formula')
const isNum = require('./is-num')
const sizeof = require('./size-of')
const kindOf = require('./kind-of')
const matcher = require('./matcher')
const Chains = require('./chains')

const deps = {isNum, formula, sizeof, matcher, kindOf}
module.exports = Object.assign(deps, Chains)
