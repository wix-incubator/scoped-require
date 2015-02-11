var Module = require('module');
var _ = require('lodash');

module.exports = function generateRequireForUserCode(userCodeDirs, forExtensions) {
  forExtensions = forExtensions || Object.keys(require.extensions);

  var baseModule = require('./lib/stubmodule-that-does-the-require');
  // so that it can be re-used again with another scoped-dir, I delete it from the cache
  delete Module._cache[baseModule.id];

  function inUserCodeDirs(modulePath) {
    return _.some(userCodeDirs, function(userCodeDir) {return modulePath.indexOf(userCodeDir) >= 0});
  }

  function removePathsNotInUserCodeDirs(m) {
    m.paths = _.filter(m.paths.concat(userCodeDirs), function(modulePath) { return inUserCodeDirs(modulePath); });
  }

  removePathsNotInUserCodeDirs(baseModule);

  _.forEach(forExtensions, function(ext) {
      var original = require.extensions[ext];
      if (original && original.__dontExtendThisScopedRequire)
        return;

      require.extensions[ext] = function requireThatAddsUserCodeDirs(m, filename) {
        if (inUserCodeDirs(m.filename))
          removePathsNotInUserCodeDirs(m);

        return original(m, filename);
      };
      Object.defineProperty(require.extensions[ext], "__dontExtendThisScopedRequire", {value: true});
    });

  return {
    require: baseModule.require.bind(baseModule),
    module: baseModule,
    clearCache: function () {
      function deleteModuleFromCache(m) {
        delete Module._cache[m.id];
        _.forEach(m.children, function (subModule) {
          deleteModuleFromCache(subModule);
        });
      }
      deleteModuleFromCache(baseModule);
    }
  }
};
