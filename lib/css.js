var fs = require('fs');
var path = require('path');
var util = require('./util');
var less = require('less');
var EventProxy = require('eventproxy').EventProxy;

function Package(options) {
	if (options == null) options = {};
	this.options = options;
}
Package.prototype = {
	getFiles: function(callback) {
		util.walk(this.options.css, function(err, files) {
			if (err) {
				for(var e in err){
					console.log(e+":"+err[e]+'\n');
				}
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
			var css = [];
			files.forEach(function(v) {
				var file_path = util.expand(v.replace(util.expand(this.options.css), this.options.ouputCssFolder));
				file_path = file_path.replace('.less', '.css');
				css.push(file_path);
			}.bind(this));

			callback(css);
		}.bind(this));
	},
	compile: function(file, callback) {
		var filePath, proxy = new EventProxy();

		var result = function(cssPath, lessPath) {
			var filePath = lessPath || cssPath;

			fs.readFile(filePath, 'utf-8', function(err, data) {
				if (err) {
					console.log(filePath + ' Not Found');
					callback(err);
					return;
				}
				if (!lessPath) {
					callback(err, data);
					return;
				}
				less.render(data, {
					paths: [path.dirname(filePath)]
				}, function(err, css) {
					if (err) {
						err.file = filePath;
						for(var e in err){
							console.log(e+":"+err[e]+'\n');
						}
					}
					callback(err, css);
				});

			}.bind(this));
		}.bind(this);
		proxy.assign('css', 'less', result);
		filePath = path.join('./', file.replace(util.expand(this.options.ouputCssFolder), this.options.css));
		path.exists(filePath, function(exists) {
			var path = exists ? filePath : '';
			proxy.trigger('css', path);
		});
		path.exists(filePath.replace('.css', '.less'), function(exists) {
			var path = exists ? filePath.replace('.css', '.less') : '';
			proxy.trigger('less', path);
		});
	},
	createServer: function(req, res, next) {
		var url = req.originalUrl;
		this.compile(url, function(err, data) {
			if (err) {
				res.statusCode = 404;
				res.end();
				return;
			}
			res.setHeader('content-type', 'text/css;charset=utf-8');
			res.setHeader('Pragma', '0');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Expires', '0');
			res.write(data);
			res.end();
		});
	},
	build: function() {
		this.getFiles(function(files) {
			files.forEach(function(v, i) {

				this.compile(v, function(err, data) {
					if (err) {
						return;
					}
					var filepath = path.join(this.options.build, v);
					util.mkdirs(path.dirname(filepath), '0777', function() {
						fs.writeFileSync(filepath, data, 'utf8');
					});

				}.bind(this));

			}.bind(this));
		}.bind(this));
	},
	buildAll: function() {
		var content = [];
		this.getFiles(function(files) {
			files.forEach(function(v, i) {
				this.compile(v, function(err, data) {
					if (err) {
						return;
					}
					content.push(data);
					if (content.length == files.length) {
						var filepath = path.join('./', this.options.build, 'css/app.css');
						util.mkdirs(path.dirname(filepath), '0777', function() {
							var css = require('./cssmin').cssmin(content.join(''));
							fs.writeFileSync(filepath, css, 'utf8');
						});
					}
				}.bind(this));

			}.bind(this));
		}.bind(this));
	}
};


exports.Package = Package;