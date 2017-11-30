const _ = require('lodash')

exports.scopedFunction = function () {
  return _.camelCase('Scoped Camel')
}
