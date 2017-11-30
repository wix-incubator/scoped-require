'use strict'
const Module = require('module')
const _ = require('lodash')
const path = require('path')

module.exports = function generateRequireForUserCode (scopedDirs, options) {
  options = _.defaults((options || {}), {autoDeleteCache: false})

  const forExtensions = Object.keys(require.extensions)
  const uniqueIdForThisScopedRequire = _.uniqueId('__dontExtendThisScopedRequire')
  scopedDirs = _.map(scopedDirs, function (dir) { return path.resolve(dir) })

  const baseModule = require('./lib/stubmodule-that-does-the-require')
  // so that it can be re-used again with another scoped-dir, I delete it from the cache
  delete Module._cache[baseModule.id]
  // make relative paths work when requiring
  baseModule.filename = path.resolve(scopedDirs[0], 'stubmodule-that-does-the-require.js')
  baseModule.__scopedRequireModule = true

  function inUserCodeDirs (modulePath) {
    return _.some(scopedDirs, function (userCodeDir) { return modulePath.indexOf(userCodeDir) >= 0 })
  }

  function adjustPaths (m) {
    m.paths = _.filter(m.paths.concat(scopedDirs), function (modulePath) { return inUserCodeDirs(modulePath) })
  }

  adjustPaths(baseModule)

  _.forEach(forExtensions, function (ext) {
    const original = require.extensions[ext]
    if (original && original[uniqueIdForThisScopedRequire]) { return }

    require.extensions[ext] = function requireThatAddsUserCodeDirs (m, filename) {
      if (((!m.parent && inUserCodeDirs(m.filename)) ||
        (m.parent && m.parent.__scopedRequireModule)) && inUserCodeDirs(m.filename)) {
        m.__scopedRequireModule = true
        adjustPaths(m)
      }

      return original(m, filename)
    }
    Object.defineProperty(require.extensions[ext], uniqueIdForThisScopedRequire, {value: true})
  })

  function deleteModuleFromCache (m) {
    delete Module._cache[m.id]
    _.forEach(m.children, function (subModule) {
      deleteModuleFromCache(subModule)
    })
    m.children = []
  }

  return {
    require: !options.autoDeleteCache
      ? baseModule.require.bind(baseModule)
      : function (path) {
        const moduleExports = baseModule.require.apply(baseModule, arguments)

        deleteModuleFromCache(baseModule)

        return moduleExports
      },
    scopedDirs: scopedDirs,
    clearCache: function () {
      deleteModuleFromCache(baseModule)
    },
    loadCodeAsModule: function (code, filename) {
      if (filename && Module._cache[filename]) { return Module._cache[filename] }

      const module = new Module(filename, baseModule)
      module.filename = filename
      module.paths = baseModule.paths
      module.__scopedRequireModule = true

      module._compile(code, module.filename || 'filename-to-make-node6-happy')

      baseModule.children.push(module)
      if (options.autoDeleteCache) { deleteModuleFromCache(baseModule) } else if (filename && !options.autoDeleteCache) { Module._cache[filename] = module }

      return module.exports
    }
  }
}
