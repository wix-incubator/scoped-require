/*global describe, it */
'use strict';
var assert = require('assert');
var scopedRequire = require('../');
var path = require('path');

describe('scoped-require node module', function () {
  it('must enable requiring from a directory that is not in the regular node path of this test', function () {
    var baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')]);
    var scopedModule = baseModule.require('scoped-module');

    assert(scopedModule.scopedFunction() === 'scopedString', 'Failed');
  });
});
