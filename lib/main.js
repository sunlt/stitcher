var fs = require('fs');
var path = require('path');
var optimist = require('optimist');
var connect = require('connect');

var util = require('./util');

var index = require('./index');
var css = require('./css');
var script = require('./script');
var proxy = require('./proxy');

var argv = optimist.usage(['  usage: stitcher COMMAND', '	server', '	build', '	create'].join("\n")).alias('p', 'port').argv;

function help() {
	optimist.showHelp();
	return process.exit();
}

function Package() {
	this.options = {
		build: './build/',
		css: './css/',
		src: './src/',
		tmpl: './tmpl/',
		images: './images/',
		index: './index.html',
		ouputJsFolder: '/js/',
		ouputCssFolder: '/css/',
		ouputTmplFolder: '/template/',
		ouputImagesFolder: '/images/',
		configFile: './project.json',
		ignoreFile: '.stitcherignore',
		ignoreRules:[],
		port: process.env.PORT || argv.port || 8124
	};

	var options = this.readConfig();
	for (var p in options) {
		this.options[p] = options[p];
	}
	if (!fs.existsSync(this.options.ignoreFile)) return;
	var txt = fs.readFileSync(this.options.ignoreFile, 'utf-8');
	txt.split('\n').forEach(function (str){
		this.options.ignoreRules.push(str.trim());
	}.bind(this));
}

Package.prototype = {
	server: function() {
		global.scriptServer = new script.Package(this.options);
		global.cssServer = new css.Package(this.options);
		global.indexServer = new index.Package(this.options);
		var app = connect.createServer();
		app.use(connect.favicon());
		var staticFiles = connect.static(this.options.images, {maxAge: 0});

		app.use('/proxy',proxy);
		app.use('/images/', staticFiles);
		app.use('/index.html', indexServer.createServer.bind(indexServer));
		app.use(this.options.ouputJsFolder, scriptServer.createServer.bind(scriptServer));
		app.use(this.options.ouputCssFolder, cssServer.createServer.bind(cssServer));
		app.use(this.options.ouputTmplFolder, scriptServer.createServer.bind(scriptServer));
		app.use('/require.js', scriptServer.requireJs.bind(scriptServer));
		app.use('/', indexServer.createServer.bind(indexServer));
		app.listen(this.options.port);
	},
	build: function() {
		util.rmdir(this.options.build);
		util.mkdir(this.options.build);

		global.scriptServer = new script.Package(this.options);
		global.cssServer = new css.Package(this.options);
		global.indexServer = new index.Package(this.options);
		
		indexServer.build();
		cssServer.build();
		scriptServer.build();
		util.copyDir(this.options.images,path.join('./', this.options.build, './images'));
	},
	create:function (){
		var projectName = argv._[1];
		if(!projectName){
			console.log('need a project name!\r\n usage: stitcher create projectName');
			return false;
		}
		var zipFilePath = path.join(__dirname,'../assets/project_template.zip');
		if(process.platform == 'win32'){
		  require('child_process').spawn(path.join(__dirname,'../assets/unzip.exe'), ["-o", zipFilePath, "-d", './'+projectName.trim()+'/']);
		}else{
		  require('child_process').spawn("unzip", ["-o", zipFilePath, "-d", './'+projectName.trim()+'/']);
		}
	},
	exec: function() {
		var command = argv._[0];		
		if (!this[command]) {
			return help();
		}
		var exit = this[command]();
		var str = {
			'server': 'Starting server on: ' + this.options.port,
			'build': 'building',
			'create': 'project:'+argv._[1]+' create ok!'
		}[command];
		if(exit === false) return;
		console.log(str);
	},
	readConfig: function(file) {
		if (file == null) {
			file = this.options.configFile;
		}
		if (!(file && fs.existsSync(file))) return {};
		return JSON.parse(fs.readFileSync(file, 'utf-8'));
	}
};

Package.exec = function() {
	new Package().exec();
};
exports.Package = Package;
exports.exec = Package.exec;