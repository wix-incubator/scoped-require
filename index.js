"use strict";
var Module = require('module');
var _ = require('lodash');
var path = require('path');

module.exports = function generateRequireForUserCode(scopedDirs, options) {
  options = _.defaults((options || {}), {autoDeleteCache: false});

  var forExtensions = Object.keys(require.extensions);
  var uniqueIdForThisScopedRequire = _.uniqueId("__dontExtendThisScopedRequire");
  scopedDirs = _.map(scopedDirs, function(dir) {return path.resolve(dir)});

  var baseModule = require('./lib/stubmodule-that-does-the-require');
  // so that it can be re-used again with another scoped-dir, I delete it from the cache
  delete Module._cache[baseModule.id];
  // make relative paths work when requiring
  baseModule.filename = path.resolve(scopedDirs[0], 'stubmodule-that-does-the-require.js');

  function inUserCodeDirs(modulePath) {
    return _.some(scopedDirs, function(userCodeDir) {return modulePath.indexOf(userCodeDir) >= 0});
  }

  function adjustPaths(m) {
    m.paths = _.filter(m.paths.concat(scopedDirs), function(modulePath) { return inUserCodeDirs(modulePath); });
  }

  adjustPaths(baseModule);

  _.forEach(forExtensions, function(ext) {
    var original = require.extensions[ext];
    if (original && original[uniqueIdForThisScopedRequire])
      return;

    require.extensions[ext] = function requireThatAddsUserCodeDirs(m, filename) {
      if (inUserCodeDirs(m.filename))
        adjustPaths(m);

      return original(m, filename);
    };
    Object.defineProperty(require.extensions[ext], uniqueIdForThisScopedRequire, {value: true});
  });

  function deleteModuleFromCache(m) {
    delete Module._cache[m.id];
    _.forEach(m.children, function (subModule) {
      deleteModuleFromCache(subModule);
    });
    m.children = [];
  }

  return {
    require: !options.autoDeleteCache ?
      baseModule.require.bind(baseModule) :
      function(path) {
        var moduleExports = baseModule.require.apply(baseModule, arguments);

        deleteModuleFromCache(baseModule);

        return moduleExports;
      },
    scopedDirs: scopedDirs,
    clearCache: function () {
      deleteModuleFromCache(baseModule);
    },
    loadCodeAsModule: function(code, filename) {
      if (filename && Module._cache[filename])
        return Module._cache[filename];

      var module = new Module(filename, baseModule);
      module.filename = filename;
      module.paths = baseModule.paths;

      module._compile(code, module.filename);

      baseModule.children.push(module);
      if (options.autoDeleteCache)
        deleteModuleFromCache(baseModule);
      else if (filename && !options.autoDeleteCache)
        Module._cache[filename] = module;


      return module.exports;
    }
  }
};
