module.exports = function() {
  return "1 and " + require('submodule-importing-from-scope2')();
};
