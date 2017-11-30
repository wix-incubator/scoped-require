/* global describe, it */
'use strict'
const assert = require('assert')
const scopedRequire = require('../')
const path = require('path')

describe('scoped-require node module', function () {
  it('must enable requiring from a directory that is not in the regular node path of this test', function () {
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')])
    const scopedModule = baseModule.require('scoped-module')

    assert.strictEqual(scopedModule.scopedFunction(), 'scopedString')
  })

  it('must support relative dirs', function () {
    const baseModule = scopedRequire(['./test/scoped-dir'])
    const scopedModule = baseModule.require('scoped-module')

    assert.strictEqual(scopedModule.scopedFunction(), 'scopedString')
  })

  it('must support relative dirs in the first require', function () {
    const baseModule = scopedRequire(['./test/scoped-dir'])
    const scopedModule = baseModule.require('./scoped-module')

    assert.strictEqual(scopedModule.scopedFunction(), 'scopedString')
  })

  it('must enable a module in a scoped dir to also be scoped to that dir', function () {
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')])

    const scopedModule = baseModule.require('scoped-module-that-imports')

    assert.strictEqual(scopedModule.aFunction(), 'astring and substring and substring2')
  })

  it('must enable a module in a scoped dir to use relative dir module loading', function () {
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')])

    const scopedModule = baseModule.require('scoped-module-that-imports-relatively')

    assert.strictEqual(scopedModule.aFunction(), 'astring and substring and substring2')
  })

  it('must enable more than one scoped baseModule', function () {
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')])
    const baseModule2 = scopedRequire([path.resolve(__dirname, 'scoped-dir-2')])

    const scopedModule = baseModule.require('scoped-module')
    const scopedModule2 = baseModule2.require('scoped-module-2')

    assert.strictEqual(scopedModule.scopedFunction(), 'scopedString')
    assert.strictEqual(scopedModule2.scopedFunction2(), 'scopedString2')
  })

  it('must enable more than one scoped dir in a base module', function () {
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir'), path.resolve(__dirname, 'scoped-dir-2')])

    const scopedModule = baseModule.require('scoped-module')
    const scopedModule2 = baseModule.require('scoped-module-2')
    const scopedModule3 = baseModule.require('module-importing-module-importing-from-scope2')

    assert.strictEqual(scopedModule.scopedFunction(), 'scopedString')
    assert.strictEqual(scopedModule2.scopedFunction2(), 'scopedString2')
    assert.strictEqual(scopedModule3(), '1 and 2 and scopedString2')
  })

  it('must not enable scoped modules to use node modules from outside its scope', function () {
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')])
    assert.throws(function () {
      baseModule.require('scoped-module-that-uses-lodash')
    })
  })

  it('must allow deleting the scoped dir cache', function () {
    global.moduleLoadSideEffect = 1
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')])
    baseModule.require('module-whose-load-side-effects')

    assert.strictEqual(global.moduleLoadSideEffect, 2)

    baseModule.require('module-whose-load-side-effects')

    assert.strictEqual(global.moduleLoadSideEffect, 2)

    baseModule.clearCache()

    baseModule.require('module-whose-load-side-effects')

    assert.strictEqual(global.moduleLoadSideEffect, 3)
  })

  it('deleting scoped-dir cache will delete also submodules', function () {
    global.moduleLoadSideEffect = 1
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')])
    baseModule.require('module-whose-submodule-load-side-effects')

    assert.strictEqual(global.moduleLoadSideEffect, 2)

    baseModule.require('module-whose-submodule-load-side-effects')

    assert.strictEqual(global.moduleLoadSideEffect, 2)

    baseModule.clearCache()

    baseModule.require('module-whose-submodule-load-side-effects')

    assert.strictEqual(global.moduleLoadSideEffect, 3)
  })

  it('deleting scoped-dir cache that includes circular-reference modules', function () {
    global.moduleLoadSideEffect = 1
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')])
    baseModule.require('module-with-circular-reference-submodules')

    assert.strictEqual(global.moduleLoadSideEffect, 2)

    baseModule.require('module-with-circular-reference-submodules')

    assert.strictEqual(global.moduleLoadSideEffect, 2)

    baseModule.clearCache()

    baseModule.require('module-with-circular-reference-submodules')

    assert.strictEqual(global.moduleLoadSideEffect, 3)
  })

  it('auto-deleting modules from cache', function () {
    global.moduleLoadSideEffect = 1
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')], {autoDeleteCache: true})
    baseModule.require('module-whose-load-side-effects-2')

    assert.strictEqual(global.moduleLoadSideEffect, 2)

    baseModule.require('module-whose-load-side-effects-2')

    assert.strictEqual(global.moduleLoadSideEffect, 3)

    baseModule.require('module-whose-load-side-effects-2')

    assert.strictEqual(global.moduleLoadSideEffect, 4)
  })

  it('must enable evaluation of code in the context of the required scope', function () {
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')])
    const moduleExports = baseModule.loadCodeAsModule("exports.result = require('scoped-module').scopedFunction()")

    assert.strictEqual(moduleExports.result, 'scopedString')
  })

  it('must cache evaluated code if given filename', function () {
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')])

    const codeWithSideEffect = "global.moduleLoadSideEffect3 = (global.moduleLoadSideEffect3 || 0) + 1; require('module-whose-load-side-effects-3');"
    const codeWithSideEffect2 = "global.moduleLoadSideEffect3 = (global.moduleLoadSideEffect3 || 0) + 2; require('module-whose-load-side-effects-3');"

    baseModule.loadCodeAsModule(codeWithSideEffect, 'foo/bar.js')

    assert.strictEqual(global.moduleLoadSideEffect3, 2)

    baseModule.loadCodeAsModule(codeWithSideEffect2, 'foo/bar.js')

    assert.strictEqual(global.moduleLoadSideEffect3, 2)

    baseModule.clearCache()

    baseModule.loadCodeAsModule(codeWithSideEffect2, 'foo/bar.js')

    assert.strictEqual(global.moduleLoadSideEffect3, 5)
  })

  it('must not cache evaluated code if autoDeleteCache', function () {
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')], {autoDeleteCache: true})

    const codeWithSideEffect = "global.moduleLoadSideEffect4 = (global.moduleLoadSideEffect4 || 0) + 1; require('module-whose-load-side-effects-4');"
    const codeWithSideEffect2 = "global.moduleLoadSideEffect4 = (global.moduleLoadSideEffect4 || 0) + 2; require('module-whose-load-side-effects-4');"

    baseModule.loadCodeAsModule(codeWithSideEffect, 'footang/bar.js')

    assert.strictEqual(global.moduleLoadSideEffect4, 2)

    baseModule.loadCodeAsModule(codeWithSideEffect2, 'footang/bar.js')

    assert.strictEqual(global.moduleLoadSideEffect4, 5)
  })

  it('must return the scopedDirs it received', function () {
    const baseModule = scopedRequire([path.resolve(__dirname, 'scoped-dir')])

    assert.deepEqual(baseModule.scopedDirs, [path.resolve(__dirname, 'scoped-dir')])
  })
})
