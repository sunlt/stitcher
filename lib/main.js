var fs = require('fs');
var path = require('path');
var optimist = require('optimist');
var connect = require('connect');
var index = require('./index');
var css = require('./css');
var script = require('./script');
var util = require('./util');

var argv = optimist.usage(['  usage: stitcher COMMAND', '	server', '	build', '	buildAll'].join("\n")).alias('p', 'port').argv;

function help() {
	optimist.showHelp();
	return process.exit();
}

function Package(options) {
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
		ignore:'.stitcherignore',
		port: process.env.PORT || argv.port || 8124
	};
	for (var p in options) {
		this.options[p] = options[p];
	}
	options = this.readConfig();
	for (var p in options) {
		this.options[p] = options[p];
	}
	var ignore = [];
	if (!(this.options.ignore && path.existsSync(this.options.ignore))) ignore = [];
	var lines = fs.readFileSync(this.options.ignore,'utf-8').replace(/\\r/ig,'').split('\n');
	for (var i = lines.length - 1; i >= 0; i--) {
		ignore.push(lines[i].toString().trim());
	}
	this.options.ignore = ignore;

}

Package.prototype = {
	server: function() {
		var app, indexServer, scriptServer, cssServer;
		scriptServer = new script.Package(this.options);
		cssServer = new css.Package(this.options);
		indexServer = new index.Package(this.options);
		app = connect.createServer();
		app.use(connect.favicon());
		var staticFiles = connect.static(this.options.images, {
			maxAge: 0
		});
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
		var queue = new util.Queue();
		queue.add(function() {
			util.rmdir(this.options.build, function(err) {
				if (err) {
					console.log(err);
				}
				queue.next();
			});

		}, this);

		queue.add(function() {
			util.mkdirs(this.options.build, function() {
				queue.next();
			});
		}, this);

		queue.add(function() {
			var app, indexServer, scriptServer, cssServer;
			scriptServer = new script.Package(this.options);
			cssServer = new css.Package(this.options);
			indexServer = new index.Package(this.options);
			indexServer.build();
			cssServer.build();
			scriptServer.build();

			util.cpdir(this.options.images, path.join('./', this.options.build, './images'), function(err) {
				if (err) {
					console(err);
					return;
				}
				queue.next();
			});

		}, this);

		queue.add(function() {
			util.delindir(path.join('./', this.options.build, './images'), function(file) {


			}, function(err) {
				if (err) {
					console(err);
					return;
				}
				queue.next();
			});
		}, this);

		queue.start();
	},
	buildAll: function() {
		var queue = new util.Queue();
		queue.add(function() {
			util.rmdir(this.options.build, function(err) {
				if (err) {
					console(err);
					return;
				}
				queue.next();
			});

		}, this);

		queue.add(function() {
			util.mkdirs(this.options.build, function() {
				queue.next();
			});
		}, this);

		queue.add(function() {
			var app, indexServer, scriptServer, cssServer;
			scriptServer = new script.Package(this.options);
			cssServer = new css.Package(this.options);
			indexServer = new index.Package(this.options);
			indexServer.buildAll();
			cssServer.buildAll();
			scriptServer.buildAll();

			util.cpdir(this.options.images, path.join('./', this.options.build, './images'), function(err) {
				if (err) {
					console(err);
					return;
				}
				queue.next();
			});

		}, this);

		queue.add(function() {
			util.delindir(path.join('./', this.options.build, './images'), function(file) {


			}, function(err) {
				if (err) {
					console(err);
					return;
				}
				queue.next();
			});
		}, this);

		queue.start();
	},
	exec: function(command) {
		if (command == null) {
			command = argv._[0];
		}
		if (!this[command]) {
			return help();
		}
		this[command]();
		var str = {
			'server': 'Starting server on: ' + this.options.port,
			'build': 'building',
			'buildAll': 'building'
		}[command];
		console.log(str);
	},
	readConfig: function(file) {
		if (file == null) {
			file = this.options.configFile;
		}
		if (!(file && path.existsSync(file))) return {};
		return JSON.parse(fs.readFileSync(file, 'utf-8'));
	}
};

Package.exec = function(command, options) {
	return (new Package(options)).exec(command);
};
exports.Package = Package;
exports.exec = Package.exec;
