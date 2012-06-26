var fs = require('fs');
var path = require('path');
var util = require('./util');

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
			var str = data.replace(/\\/g,"\\\\").replace(/\\/g,"\\/").replace(/\'/g,"\\\'").replace(/\"/g,"\\\"").replace(/\r/g,'').replace(/\n/g,'\\n');
			var content = 'function(exports, require, module) {\n';
			content +='var ejs = require("/js/lib/ejs");\n';
			content +='ejs.open = "{{";ejs.close = "}}";\n';
			content +='var str = \''+str+'\';\n';
			content +='module.exports = function (obj){obj = obj || {};obj.require = require;obj.filename = \''+filePath+'\';return ejs.render(str,obj);};\n }';
			callback(err, content);
		});
	}
};

exports.Package = Package;