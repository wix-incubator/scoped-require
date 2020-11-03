'use strict'
const Module = require('module')
const _ = require('lodash')
const path = require('path')

module.exports = function generateRequireForUserCode (scopedDirs, options) {
  options = _.defaults((options || {}), {autoDeleteCache: false})

  scopedDirs = _.map(scopedDirs, function (dir) { return path.resolve(dir) })

  const baseModule = require('./lib/stubmodule-that-does-the-require')
  // so that it can be re-used again with another scoped-dir, I delete it from the cache
  delete Module._cache[baseModule.id]
  // make relative paths work when requiring
  baseModule.filename = path.resolve(scopedDirs[0], 'stubmodule-that-does-the-require.js')

  function addPaths (m) {
    m.paths = m.paths.concat(scopedDirs)
  }

  addPaths(baseModule)

  _.forEach(require.extensions, function (extensionFunc, extension) {
    const original = extensionFunc

    require.extensions[extension] = function requireThatAddsUserCodeDirs (m, filename) {
      addPaths(m)

      return original(m, filename)
    }
  })

  function deleteModuleFromCache (m) {
    if (m && m.id && m.id.endsWith('.node')) {
      m.parent = null
      return
    }
    delete Module._cache[m.id]
    const moduleChildren = m.children
    m.children = []
    _.forEach(moduleChildren, function (subModule) {
      deleteModuleFromCache(subModule)
    })
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

      module._compile(code, module.filename || 'filename-to-make-node6-happy')

      baseModule.children.push(module)
      if (options.autoDeleteCache) { deleteModuleFromCache(baseModule) } else if (filename && !options.autoDeleteCache) { Module._cache[filename] = module }

      return module.exports
    }
  }
}
