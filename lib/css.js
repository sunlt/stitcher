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
				console.dir(err);
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
			fs.exists(filePath, function(exists) {
				var path = exists ? filePath : '';
				cb(path);
			});
		},this);

		p.add(function (cb){
			fs.exists(filePath.replace('.css', '.less'), function(exists) {
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
					callback(null, data);
					return;
				}

				var parser = new less.Parser({paths: [path.dirname(filePath)]});
				parser.parse(data, function (err, tree) {
				    if (err) { 
				    	err.file = filePath;
				    	return callback(err,''); 
				    }
				    var css;
				    try{
				    	css = tree.toCSS();
				    }catch(e){
				    	e.file = filePath;
				    	return callback(e,'');
				    }
				    callback(null,css);				    
				});

			}.bind(this));
		},this);

		p.start();		
	},
	createServer: function(req, res, next) {
		var url = req.originalUrl;
		this.compile(url, function(err, data) {
			if (err) {
				console.dir(err);
				console.log('====================================');
				res.statusCode = 500;
				res.write(JSON.stringify(err),'utf-8');
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
							console.dir(err);
							return console.log('====================================');							
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
			var source = [];
			for (var i = rev.length - 1; i >= 0; i--) {
				source.push(rev[i].result);
			};
			var css = require('./cssmin').cssmin(source.join(''));
			fs.writeFileSync(filepath, css, 'utf8');
		},this);

	}
};


exports.Package = Package;