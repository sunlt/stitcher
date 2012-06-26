var fs = require('fs');
var path = require('path');
var util = require('./util');
var template = require('./template');
var coffeescript = require('coffee-script');

function Package(options) {
	options = options ||{};
	this.options = options;
	this.template = new template.Package(this.options);
}
Package.prototype = {
	getFiles: function(callback) {
		var proxy = new EventProxy();
		var result = function(scriptFiles, templateFiles) {
				var script = [];
				scriptFiles.forEach(function(v) {
					var file_path = util.expand(v.replace(this.options.src, this.options.ouputJsFolder));
					script.push(file_path);
				}.bind(this));
				callback(script, templateFiles);
			}.bind(this);
		proxy.assign('script', 'template', result);

		util.walk(this.options.src, function(err, files) {
			if (err) {
				console.log(err);
				return;
			}
			var ignores = this.options.ignore;
			files = files.filter(function (item){
				var result = true;
				for (var i = ignores.length - 1; i >= 0; i--) {
					var ignore = ignores[i];
					if(util.shExpMatch(item,ignore)){
						result = false;
						break;
					}
				}
				return result;
			});
			var result = [];
			files.forEach(function(v) {
				result.push(v.replace('.coffee', '.js'));
			});
			proxy.trigger('script', result);
		}.bind(this));
		this.template.getFiles(function(files) {
			proxy.trigger('template', files);
		});
	},
	getRealPath: function(url, callback) {
		var dirname = util.expand(path.dirname(url));
		if (dirname.indexOf(util.expand(this.options.ouputJsFolder)) != -1) {
			var filePath = path.join('./', url.replace(util.expand(this.options.ouputJsFolder), this.options.src));
			var proxy = new EventProxy();
			var result = function(jsPath, coffeePath) {
					var filePath = coffeePath || jsPath;
					callback(filePath);
				}.bind(this);
			proxy.assign('js', 'coffee', result);
			path.exists(filePath, function(exists) {
				var path = exists ? filePath : '';
				proxy.trigger('js', path);
			});
			path.exists(filePath.replace('.js', '.coffee'), function(exists) {
				var path = exists ? filePath.replace('.js', '.coffee') : '';
				proxy.trigger('coffee', path);
			});
		} else if (dirname.indexOf(util.expand(this.options.ouputTmplFolder)) != -1 ) {
			var filePath = path.join('./', url.replace(util.expand(this.options.ouputTmplFolder), this.options.tmpl));
			filePath = filePath.replace('.js', '.html');
			callback(filePath);
		}
	},
	compile: function(file, callback) {
		var relativePath = util.expand(file);
		this.getRealPath(file, function(filePath) {
			if (filePath.indexOf('.html') != -1) {
				this.template.compile(filePath, function(err, content) {
					callback(err, {
						path: relativePath,
						content: content
					});
				});
			} else if (filePath.indexOf('.coffee') != -1) {
				fs.readFile(filePath, 'utf-8', function(err, data) {
					if (err) {
						console.log(filePath + ' Not Found');
						callback(err);
						return;
					}
					var code = '';
					try {
						code = coffeescript.compile(data);
					} catch (e) {
						e.filePath = filePath;
						console.log(e);
					}

					var content = 'function(exports, require, module) { ';
					content += code;
					content += '\n}';
					callback(err, {
						path: relativePath,
						content: content
					});
				});
			} else if (filePath.indexOf('.js') != -1) {
				fs.readFile(filePath, 'utf-8', function(err, data) {
					if (err) {
						console.log(filePath + ' Not Found');
						callback(err);
						return;
					}


					var content = 'function(exports, require, module) { ';
					content += data;
					content += '\n}';
					callback(err, {
						path: relativePath,
						content: content
					});
				});
			}
		}.bind(this));
	},
	createServer: function(req, res, next) {
		var url = req.originalUrl;
		this.compile(url, function(err, data) {
			if (err) {
				res.statusCode = 404;
				res.end();
				return;
			}
			res.setHeader('content-type', 'text/javascript;charset=utf-8');
			res.setHeader('Pragma', '0');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Expires', '0');
			var source = '';
			source += 'if(!window.__sourceMap){window.__sourceMap = {};}';
			source += '__sourceMap["' + data.path.replace('.js', '') + '"]=';
			source += data.content;
			res.write(source);
			res.end();
		});
	},
	requireJs: function(req, res, next) {
		var file = path.join(__dirname, '../', 'assets/require.js');
		fs.readFile(file, 'utf-8', function(err, data) {
			if (err) throw err;
			res.setHeader('content-type', 'text/javascript;charset=utf-8');
			res.setHeader('Pragma', '0');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Expires', '0');
			var content = eco.render(data, {});
			res.write(content);
			res.end();
		});
	},
	build: function() {
		var content = [];
		this.getFiles(function(files, templateFiles) {
			files = [].concat(files, templateFiles);
			files.forEach(function(v, i) {
				this.compile(v, function(err, data) {
					if (err) {
						return;
					}
					var source = '';
					source += '"' + data.path.replace('.js', '') + '":';
					source += data.content;
					content.push(source);
					if (content.length == files.length) {
						var filepath = path.join('./', this.options.build, 'js/app.js');
						util.mkdirs(path.dirname(filepath), '0777', function() {
							var file = path.join(__dirname, '../', 'assets/require.js');
							fs.readFile(file, 'utf-8', function(err, data) {
								if (err) throw err;
								var data = eco.render(data, {sourceMap: content.join(',')});
								require('./closure_compiler').compress(data, function(err, code) {
									if (err) {
										console.log(err);
										return;
									}
									fs.writeFileSync(filepath, code, 'utf8');
								});
							}.bind(this));
						}.bind(this));
					}

				}.bind(this));
			}.bind(this));
		}.bind(this));
	}
};

exports.Package = Package;