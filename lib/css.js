var fs = require('fs');
var path = require('path');
var less = require('less');

var util = require('./util');
var ignore = require('./ignore');

function Package(options) {
	if (options == null) options = {};
	this.options = options;
}
Package.prototype = {
	getFiles: function(callback) {
		ignore(this.options.css,this.options.ignoreRules,['.css','.less'],function (err,files){
			if (err) {
				console.log(err);
				callback([]);
				return;
			}

			var css = [];
			files.forEach(function(v) {
				var file_path = util.expand(v.replace(util.expand(this.options.css), this.options.ouputCssFolder));
				file_path = file_path.replace('.less', '.css');
				css.push(file_path);
			}.bind(this));

			callback(css);

		},this);
	},
	compile: function(file, callback) {
		var p = new util.Parallel();

		var filePath = path.join('./', file.replace(util.expand(this.options.ouputCssFolder), this.options.css));
		p.add(function (cb){
			path.exists(filePath, function(exists) {
				var path = exists ? filePath : '';
				cb(path);
			});
		},this);

		p.add(function (cb){
			path.exists(filePath.replace('.css', '.less'), function(exists) {
				var path = exists ? filePath.replace('.css', '.less') : '';
				cb(path);
			});
		},this);

		p.done(function(rev,cssPath, lessPath) {
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
				less.render(data, {paths: [path.dirname(filePath)]}, function(err, css) {
					if (err) {
						var errtxt = 'less file:'+file+' -- '+err.toString();
						callback(errtxt,'');
					}
					callback(null, css);
				});

			}.bind(this));
		},this);

		p.start();		
	},
	createServer: function(req, res, next) {
		var url = req.originalUrl;
		this.compile(url, function(err, data) {
			if (err) {
				console.log(err);
				res.statusCode = 500;
				res.write(err.toString(),'utf-8');
				res.end();
				return;
			}
			res.setHeader('content-type', 'text/css;charset=utf-8');
			res.setHeader('Pragma', '0');
			res.setHeader('Cache-Control', 'no-cache');
			res.setHeader('Expires', '0');
			res.write(data,'utf-8');
			res.end();
		});
	},
	build: function() {
		var queue = new util.Queue();
		var p = new util.Parallel();

		queue.add(function (){
			this.getFiles(queue.next.bind(queue));
		},this);

		queue.add(function (files){
			files.forEach(function(v, i) {
				p.add(function (cb){

					this.compile(v, function(err, data) {
						if (err) {
							console.log(err);
							return;
						}
						cb(data);

					}.bind(this));

				},this);
			}.bind(this));
			p.start();

		},this);
		queue.start();

		p.done(function (rev){
			var filepath = path.join('./', this.options.build, 'css/app.css');
			util.mkdir(path.dirname(filepath), '0777');
			var css = require('./cssmin').cssmin(rev.join(''));
			fs.writeFileSync(filepath, css, 'utf8');
		},this);

	}
};


exports.Package = Package;