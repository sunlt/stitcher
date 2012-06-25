var fs = require('fs');
var path = require('path');

var css = require('./css');
var script = require('./script');

function Package(options) {
	if (options == null) options = {};
	this.options = options;
	
	this.script = new script.Package(this.options);
	this.css = new css.Package(this.options);
}
Package.prototype = {
	getFiles:function (callback){
		var p = new util.Parallel(function (rev,scriptFiles,cssFiles){
			callback(scriptFiles,cssFiles);
		},this);
		p.add(function (cb){
			this.script.getFiles(function (files,templateFiles){
				cb([].concat(files,templateFiles));
			});
		});

		p.add(function (cb){
			this.css.getFiles(function (files){
				cb(files);
			});
		});
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
			var html = this.render({script:scriptFiles,css:cssFiles});
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
		var html = this.render({script:['js/app.js'],css:['css/app.css']});
		var filepath = path.join('./',this.options.build,this.options.index);
		fs.writeFileSync(filepath, html,'utf8');
	}
};

exports.Package = Package;