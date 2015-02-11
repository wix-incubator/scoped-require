#  [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-url]][daviddm-image]

> Require that is scoped to directories


## Install

```sh
$ npm install --save scoped-require
```


## Usage

```js
var scoped-require = require('scoped-require');

var baseModule = scoped-require(['dir-with-module']);

var aModule = baseModule.require('a-module');
```


## License

MIT © [Wix]()


[npm-url]: https://npmjs.org/package/scoped-require
[npm-image]: https://badge.fury.io/js/scoped-require.svg
[travis-url]: https://travis-ci.org/wix/scoped-require
[travis-image]: https://travis-ci.org/wix/scoped-require.svg?branch=master
[daviddm-url]: https://david-dm.org/giltayar/scoped-require.svg?theme=shields.io
[daviddm-image]: https://david-dm.org/giltayar/scoped-require
