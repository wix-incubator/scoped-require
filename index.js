var Module = require('module');
var _ = require('lodash');

module.exports = function generateRequireForUserCode(userCodeDirs, forExtensions) {
  forExtensions = forExtensions || Object.keys(require.extensions);

  var baseModule = require('./lib/stubmodule-that-does-the-require');
  baseModule.paths = module.paths.concat(userCodeDirs);

  _.forEach(forExtensions, function(ext) {
      var original = require.extensions[forExtensions[ext]];
      if (original && original.__dontExtendThisScopedRequire)
        return;

      require.extensions[forExtensions[ext]] = function requireThatAddsUserCodeDirs(m, filename) {
        if (_.some(userCodeDirs, function(userCodeDir) {return m.filename.startsWith(userCodeDir)})) {
          m.paths = _.filter(m.paths.concat(userCodeDirs), function(modulePath) {
            return _.some(userCodeDirs, function(userCodeDir) {return modulePath.startsWith(userCodeDir)});
          });
        }

        return original(m, filename);
      };
      Object.defineProperty(require.extensions[forExtensions[ext]], "__dontExtendThisScopedRequire", {value: true});
    });

  delete Module._cache[baseModule.id];


  return {
    require: baseModule.require.bind(baseModule),
    module: baseModule,
    clearCache: function () {
      _.forEach(baseModule.children, function (subModule) {
        delete Module._cache[subModule.id];
      });
      return _.map(baseModule.children, function (m) {
        return m.id
      });
    }
  }
};
