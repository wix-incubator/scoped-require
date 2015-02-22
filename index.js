var Module = require('module');
var _ = require('lodash');
var path = require('path');
var vm = require('vm');

module.exports = function generateRequireForUserCode(scopedDirs) {
  var forExtensions = Object.keys(require.extensions);
  scopedDirs = _.map(scopedDirs, function(dir) {return path.resolve(dir)});

  var baseModule = require('./lib/stubmodule-that-does-the-require');
  // so that it can be re-used again with another scoped-dir, I delete it from the cache
  delete Module._cache[baseModule.id];

  function inUserCodeDirs(modulePath) {
    return _.some(scopedDirs, function(userCodeDir) {return modulePath.indexOf(userCodeDir) >= 0});
  }

  function adjustPaths(m) {
    m.paths = _.filter(m.paths.concat(scopedDirs), function(modulePath) { return inUserCodeDirs(modulePath); });
  }

  adjustPaths(baseModule);

  _.forEach(forExtensions, function(ext) {
    var original = require.extensions[ext];
    if (original && original.__dontExtendThisScopedRequire)
      return;

    require.extensions[ext] = function requireThatAddsUserCodeDirs(m, filename) {
      if (inUserCodeDirs(m.filename))
        adjustPaths(m);

      return original(m, filename);
    };
    Object.defineProperty(require.extensions[ext], "__dontExtendThisScopedRequire", {value: true});
  });

  return {
    require: baseModule.require.bind(baseModule),
    scopedDirs: scopedDirs,
    clearCache: function () {
      function deleteModuleFromCache(m) {
        delete Module._cache[m.id];
        _.forEach(m.children, function (subModule) {
          deleteModuleFromCache(subModule);
        });
      }
      deleteModuleFromCache(baseModule);
    },
    loadCodeAsModule: function(code, filename) {
      var module = new Module(filename, baseModule);
      module.filename = filename;
      module.paths = baseModule.paths;

      module._compile(code, module.filename);

      return module.exports;
    }
  }
};
