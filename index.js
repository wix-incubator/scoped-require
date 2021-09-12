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
    m.paths = _.uniq([...m.paths, ...scopedDirs])
  }

  addPaths(baseModule)

  _.forEach(require.extensions, function (extensionLoader, extension) {
    const original = extensionLoader

    require.extensions[extension] = function requireThatAddsUserCodeDirs (m, filename) {
      addPaths(m)

      return original(m, filename)
    }
  })

  function isSubPath (parent, modulePath) {
    const relative = path.relative(parent, modulePath)
    return relative && !relative.startsWith('..')
  }

  function shouldDeleteFromCache (modulePath, directoriesToClear) {
    if (_.isEmpty(directoriesToClear) || modulePath === baseModule.id) {
      return true
    }

    return _.some(directoriesToClear, (directoryToClear) => isSubPath(directoryToClear, modulePath))
  }

  function deleteModuleFromCache (m, directoriesToClear) {
    if (m && m.id && m.id.endsWith('.node')) {
      m.parent = null
      return
    }

    if (!shouldDeleteFromCache(m.id, directoriesToClear)) {
      return false
    }

    delete Module._cache[m.id]
    const moduleChildren = m.children
    m.children = []
    _.forEach(moduleChildren, function (subModule) {
      deleteModuleFromCache(subModule, directoriesToClear)
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
    clearCache: function (directoriesToClear) {
      deleteModuleFromCache(baseModule, directoriesToClear)
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
