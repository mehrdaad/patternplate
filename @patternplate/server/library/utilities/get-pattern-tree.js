'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.getPatternTree = exports.getPatterns = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

let getPatterns = exports.getPatterns = (() => {
	var _ref = _asyncToGenerator(function* (base) {
		const resolve = _path2.default.resolve.bind(null, base);
		const cwd = resolve('.');
		const read = function read(f) {
			return (0, _loadJson2.default)(resolve(f));
		};

		if (!(yield (0, _pathExists2.default)(cwd))) {
			return [];
		}

		const files = yield (0, _globby2.default)(`**/pattern.json`, { cwd: cwd });

		const envs = (yield (0, _getEnvironments2.default)(cwd)).filter(function (env) {
			return env.display;
		}).map(function (env) {
			return env.name;
		});

		const readings = yield Promise.all(files.filter(function (file) {
			return ['@environments', '@docs'].every(function (i) {
				return !file.startsWith(i);
			});
		}).map((() => {
			var _ref2 = _asyncToGenerator(function* (file) {
				const id = file.split(_path2.default.sep).join('/');

				var _ref3 = yield read(file);

				var _ref4 = _slicedToArray(_ref3, 2);

				const err = _ref4[0];
				const data = _ref4[1];


				if (err) {
					return err;
				}

				data.displayName = data.displayName || data.name || null;
				const manifest = _extends({}, DEFAULT_MANIFEST, data);
				return { id: id, path: file, manifest: manifest, envs: envs };
			});

			return function (_x2) {
				return _ref2.apply(this, arguments);
			};
		})()));

		var _partition = (0, _lodash.partition)(readings, function (r) {
			return r instanceof Error;
		});

		var _partition2 = _slicedToArray(_partition, 2);

		const errors = _partition2[0];
		const patterns = _partition2[1];


		return patterns.map(function (pattern) {
			pattern.dependencies = getDependencies(pattern, { key: 'patterns' });
			pattern.demoDependencies = getDependencies(pattern, { key: 'demoPatterns' });
			pattern.dependents = getDependents(pattern, { pool: patterns, key: 'patterns' });
			pattern.demoDependents = getDependents(pattern, { pool: patterns, key: 'demoPatterns' });
			return pattern;
		});
	});

	return function getPatterns(_x) {
		return _ref.apply(this, arguments);
	};
})();

let getPatternTree = exports.getPatternTree = (() => {
	var _ref5 = _asyncToGenerator(function* (base) {
		return treeFromPaths((yield getPatterns(base)));
	});

	return function getPatternTree(_x3) {
		return _ref5.apply(this, arguments);
	};
})();

let treeFromPaths = (() => {
	var _ref6 = _asyncToGenerator(function* (files) {
		const tree = {
			id: 'root',
			children: []
		};

		yield Promise.all(files.map((0, _throat2.default)(1, (() => {
			var _ref7 = _asyncToGenerator(function* (file) {
				const parts = file.path.split('/');
				let level = tree;

				return yield Promise.all(parts.map((0, _throat2.default)(1, (() => {
					var _ref8 = _asyncToGenerator(function* (id, i) {
						const existing = level.children.find(function (c) {
							return c.name === id;
						});
						const n = parts[i + 1];
						const itemPath = parts.slice(0, i + 1);

						if (!n) {
							return null;
						}

						const type = getType(n || id);
						const name = getName(id, file.manifest);

						if (existing) {
							level = existing;
							return null;
						}

						const fromPatterns = _path2.default.resolve.bind(null, './patterns');
						const contents = yield getDoc(fromPatterns.apply(undefined, _toConsumableArray(itemPath)), { type: type });

						const ast = (0, _remark2.default)().parse(contents);
						const first = (0, _unistUtilFind2.default)(ast, { type: 'heading', depth: 1 });
						const front = typeof contents === 'string' ? (0, _frontMatter2.default)(contents).attributes : {};
						const manifest = (0, _lodash.merge)({}, DEFAULT_MANIFEST, front);
						manifest.name = first ? first.children[0].value : name;
						manifest.displayName = manifest.displayName || manifest.name;

						const item = {
							contents: contents,
							name: name,
							manifest: type === 'folder' ? manifest : file.manifest,
							id: parts.slice(0, i + 1).join('/'),
							path: itemPath,
							type: type
						};

						level.children.push(item);

						if (item.type === 'folder') {
							item.children = [];
							level = item;
						} else {
							item.dependents = file.dependents;
							item.demoDependents = file.demoDependents;
							item.dependencies = file.dependencies;
							item.demoDependencies = file.demoDependencies;
							item.envs = file.envs;
						}

						return null;
					});

					return function (_x6, _x7) {
						return _ref8.apply(this, arguments);
					};
				})())));
			});

			return function (_x5) {
				return _ref7.apply(this, arguments);
			};
		})())));

		return tree;
	});

	return function treeFromPaths(_x4) {
		return _ref6.apply(this, arguments);
	};
})();

let getDoc = (() => {
	var _ref9 = _asyncToGenerator(function* (itemPath, context) {
		const baseName = context.type === 'pattern' ? 'index.md' : 'readme.md';
		const file = _path2.default.resolve(itemPath, baseName);

		if (!(yield (0, _pathExists2.default)(file))) {
			return '';
		}
		return String((yield sander.readFile(file)));
	});

	return function getDoc(_x8, _x9) {
		return _ref9.apply(this, arguments);
	};
})();

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _frontMatter = require('front-matter');

var _frontMatter2 = _interopRequireDefault(_frontMatter);

var _globby = require('globby');

var _globby2 = _interopRequireDefault(_globby);

var _lodash = require('lodash');

var _pathExists = require('path-exists');

var _pathExists2 = _interopRequireDefault(_pathExists);

var _remark = require('remark');

var _remark2 = _interopRequireDefault(_remark);

var _unistUtilFind = require('unist-util-find');

var _unistUtilFind2 = _interopRequireDefault(_unistUtilFind);

var _sander = require('sander');

var sander = _interopRequireWildcard(_sander);

var _throat = require('throat');

var _throat2 = _interopRequireDefault(_throat);

var _getEnvironments = require('./get-environments');

var _getEnvironments2 = _interopRequireDefault(_getEnvironments);

var _loadJson = require('./load-json');

var _loadJson2 = _interopRequireDefault(_loadJson);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const DEFAULT_MANIFEST = {
	displayName: '',
	version: '1.0.0',
	build: true,
	display: true,
	flag: 'alpha',
	options: {},
	patterns: {}
};

function getDependencies(pattern, config) {
	return Object.values(pattern.manifest[config.key] || {});
}

function getDependents(pattern, config) {
	const id = _path2.default.dirname(pattern.id);

	return config.pool.filter(item => getDependencies(item, { key: config.key }).includes(id)).filter(item => item.id !== id).map(item => _path2.default.dirname(item.id));
}

function getName(basename, manifest) {
	if (basename === 'pattern.json') {
		return manifest.name;
	}
	return basename;
}

function getType(basename) {
	if (basename === 'pattern.json') {
		return 'pattern';
	}
	return 'folder';
}