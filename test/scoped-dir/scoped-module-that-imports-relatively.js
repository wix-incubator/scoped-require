var subModule = require('./afolder/asubmodule');

module.exports.aFunction = function() {
  return "astring and " + subModule();
};
