(function () {
	var modules = {},
	cache = {},
	require = function (name, root) {
		var fn;
		var path = expand(root, name);
		var module = cache[path] || cache[expand(path, './index')];
		if (module) {
			return module;
		} else if (fn = modules[path] || modules[path = expand(path, './index')]) {
			module = {
				id : name,
				exports : {}
				
			};
			cache[path] = module.exports;
			fn(module.exports, function (name) {				
				return require(name, dirname(path));
			}, module);			
			return cache[path] = module.exports;
		} else {
			throw 'module ' + name + ' not found,path is '+path;
		}
	},
	expand = function (root, name) {
		var results = [],
		parts,
		part;			
		if (/^\.\.?(\/|$)/.test(name)) {
				parts = [root,name].join('/').split('/');
		}else {
			parts = name.split('/')
		}
		for (var i = 0, length = parts.length; i < length; i++) {
			part = parts[i];
			if (part == '..') {
				results.pop();
			} else if (part != '.' && part != '') {
				results.push(part);
			}
		}
		return results.join('/');
	},
	dirname = function (path) {
		return path.split('/').slice(0, -1).join('/');
	};
	return function (bundle) {
		for (var key in bundle)
			modules[key] = bundle[key];
		return  function (name) {
			return require(name, '');
		};
	};
}).call(this)(<%-(!!sourceMap?'{'+sourceMap+'}':'__sourceMap') %>)('./js/main');