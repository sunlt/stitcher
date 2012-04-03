var fs = require('fs');
var path = require('path');
var util = require('./util');
var eco = require('eco');
var EventProxy = require('eventproxy').EventProxy;

function Package(options) {
	if (options == null) options = {};
	this.options = options;
}
Package.prototype = {
	getFiles: function(callback) {
		util.walk(this.options.tmpl, function(err, files) {
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
			var template = [];
			files.forEach(function(v) {
				var file_path = util.expand(v.replace(this.options.tmpl, this.options.ouputTmplFolder));
				file_path = file_path.replace('.html', '.js');
				template.push(file_path);
			}.bind(this));
			callback(template);
		}.bind(this));
	},
	compile: function(filePath, callback) {
		fs.readFile(filePath, 'utf-8', function(err, data) {
			if (err) {
				console.log(filePath + ' Not Found');
				callback(err);
				return;
			}

			var content = 'function(exports, require, module) {\n';
			content += 'var tmpl = ';
			try {
				content += eco.precompile(data);
			} catch (e) {
				content += 'function (){};';
				e.filePath = filePath;
				console.log(e);
			}
			content += '\n exports.tmpl = tmpl;';
			content += '\n}';
			callback(err, content);
		});
	}
};

exports.Package = Package;