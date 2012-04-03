var fs = require('fs');
var path = require('path');
var eco = require('eco');
var EventProxy = require('eventproxy').EventProxy;
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
		var proxy = new EventProxy();
		var result = function (scriptFiles,cssFiles){
			callback(scriptFiles,cssFiles);
		};
		proxy.assign('script','css', result);
		this.script.getFiles(function (files,templateFiles){
			proxy.trigger('script', [].concat(files,templateFiles));
		});
		this.css.getFiles(function (files){
			proxy.trigger('css', files);
		});
	},
	render:function (data){
		var html = '';
		var filePath = path.join('./',this.options.index);
		try{
			var tmpl = fs.readFileSync(filePath, 'utf-8');
			html = eco.render(tmpl,data);			
		}catch (e){
			console.log(e.stack);
		}
		return html;
	},
	compile : function(callback) {
		this.getFiles(function (scriptFiles,cssFiles){
			scriptFiles.push('require.js');
			var html = this.render({script:scriptFiles,css:cssFiles});
			callback(html);
		}.bind(this));
    },
	compileAll:function (callback){
		var html = this.render({script:['js/app.js'],css:['css/app.css']});
		callback(html);
	},
	createServer : function(req, res, next) {
		this.compile(function (content){
			res.setHeader('Pragma','0');
			res.setHeader('Cache-Control','no-cache');
			res.setHeader('Expires','0');
			res.write(content);
			res.end();
		});
    },
	build:function (){
		this.compile(function (content){
			var filepath = path.join(this.options.build,this.options.index);
			fs.writeFileSync(filepath, content,'utf8');
		}.bind(this));
	},
	buildAll:function (){
		this.compileAll(function (content){
			var filepath = path.join('./',this.options.build,this.options.index);
			fs.writeFileSync(filepath, content,'utf8');
		}.bind(this));
	}
};

exports.Package = Package;