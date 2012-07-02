var fs = require('fs');
var path = require('path');

var util = require('./util');

function Package(options) {
	if (options == null) options = {};
	this.options = options;
}
Package.prototype = {
	getFiles:function (callback){
		var p = new util.Parallel();

		p.add(function (cb){
			scriptServer.getFiles(function (files,templateFiles){
				cb([].concat(files,templateFiles));
			});
		});

		p.add(function (cb){
			cssServer.getFiles(function (files){
				cb(files);
			});
		});

		p.done(function (rev,scriptFiles,cssFiles){
			callback(scriptFiles,cssFiles);
		},this);

		p.start();
	},
	render:function (data){
		var filePath = path.join('./',this.options.index);
		var tmpl = fs.readFileSync(filePath, 'utf-8');
		return util.tmpl(tmpl,data);
	},
	compile:function(callback) {
		this.getFiles(function (scriptFiles,cssFiles){
			scriptFiles.push('require.js');
			var html = this.render({filename:'index.html',script:scriptFiles,css:cssFiles,develop:true,release:false});
			callback(html);
		}.bind(this));
  },
	createServer : function(req, res, next) {
		this.compile(function (content){
			res.setHeader('Pragma','0');
			res.setHeader('Cache-Control','no-cache');
			res.setHeader('Expires','0');
			res.write(content,'utf-8');
			res.end();
		});
    },
	build:function (){
		var html = this.render({filename:'index.html',script:['js/app.js'],css:['css/app.css'],develop:false,release:true});
		var filepath = path.join('./',this.options.build,this.options.index);
		fs.writeFileSync(filepath, html,'utf8');
	}
};

exports.Package = Package;