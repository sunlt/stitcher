var fs = require('fs');
var path = require('path');
var coffeescript = require('coffee-script');


var util = require('./util');
var ignore = require('./ignore');
var template = require('./template');

function Package(options) {
	options = options ||{};
	this.options = options;
	this.template = new template.Package(this.options);
}
Package.prototype = {
	getFiles: function(callback) {
		var p = new util.Parallel();

		p.add(function (cb){
			this.template.getFiles(function (templates){
				cb(templates);
			});
		},this);

		p.add(function (cb){
			ignore(this.options.src,this.options.ignoreRules,['.js','.coffee'],function (err,files){
				if (err) {
					console.log(err);
					cb([]);
					return;
				}
				var result = [];
				files.forEach(function(v) {
					result.push(v.replace('.coffee', '.js'));
				});
				cb(result);
			},this);
		},this);

		p.done(function (rev,templateFiles,scriptFiles){
			var scripts = [];
			scriptFiles.forEach(function(v) {
				var file_path = util.expand(v.replace(this.options.src, this.options.ouputJsFolder));
				scripts.push(file_path);
			}.bind(this));
			callback(scripts, templateFiles);
		},this);

		p.start();
	},

	getRealPath: function(url, callback) {
		var dirname = util.expand(path.dirname(url));
		if (dirname.indexOf(util.expand(this.options.ouputJsFolder)) != -1) {
			var filePath = path.join('./', url.replace(util.expand(this.options.ouputJsFolder), this.options.src));

			var p = new util.Parallel();

			p.add(function (cb){
				path.exists(filePath, function(exists) {
					var path = exists ? filePath : '';
					cb(path);
				});
			},this);

			p.add(function (cb){
				path.exists(filePath.replace('.js', '.coffee'), function(exists) {
					var path = exists ? filePath.replace('.js', '.coffee') : '';
					cb(path);
				});
			},this);

			p.done(function (rev,jsPath, coffeePath){
				var filePath = coffeePath || jsPath;
				callback(filePath);
			},this);
			p.start();
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
						console.dir(e);
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
			res.write(source,'utf-8');
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
			res.write(util.tmpl(data,{sourceMap:null}),'utf-8');
			res.end();
		});
	},
	build: function() {
		var queue = new util.Queue();
		var p = new util.Parallel();

		queue.add(function (){
			this.getFiles(queue.next.bind(queue));
		},this);

		queue.add(function (scripts, templateFiles){
			var files = [].concat(scripts,templateFiles);
			files.forEach(function(v, i) {
				p.add(function (cb){
					this.compile(v, function(err, data) {
						if (err) {
							console.log(err);
							return;
						}
						var source = '';
						source += '"' + data.path.replace('.js', '') + '":';
						source += data.content;
						cb(source);
					}.bind(this));
				},this);
			}.bind(this));
			p.start();
		},this);
		queue.start();

		p.done(function (rev){

			var filepath = path.join('./', this.options.build, 'js/app.js');
			util.mkdir(path.dirname(filepath), '0777');

			var requireJs = path.join(__dirname, '../', 'assets/require.js');
			var data = fs.readFileSync(requireJs, 'utf-8');
			var sources = [];
			for (var i = rev.length - 1; i >= 0; i--) {
				sources.push(rev[i].result);
			};
			var source = util.tmpl(data,{sourceMap: sources.join(',')});

			require('./closure_compiler').compress(source, function(err, code) {
				if (err) {
					console.log(err);
					return;
				}
				fs.writeFileSync(filepath, code, 'utf8');
			});

		},this);

	}
};

exports.Package = Package;