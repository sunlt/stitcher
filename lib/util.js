var fs = require('fs');
var path = require('path');

exports.walk = function walk(dir, done) {
	var results = [];
	fs.readdir(dir, function(err, list) {
		if (err) return done(err);
		var pending = list.length;
		if (!pending) return done(null, results);
		list.forEach(function(file) {
			if (dir[dir.length - 1] == '/') {
				file = dir + file;
			} else {
				file = dir + '/' + file;
			}
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					walk(file, function(err, res) {
						results = results.concat(res);
						if (!--pending) done(null, results);
					});
				} else {
					results.push(file);
					if (!--pending) done(null, results);
				}
			});
		});
	});
};

exports.expand = function(name) {
	var root = '/';
	var results = [],
		parts, part;
	if (/^\.\.?(\/|$)/.test(name)) {
		parts = [root, name].join('/').split('/');
	} else {
		parts = name.split('/');
	}
	for (var i = 0, length = parts.length; i < length; i++) {
		part = parts[i];
		if (part == '..') {
			results.pop();
		} else if (part != '.' && part != '') {
			results.push(part);
		}
	}
	return results.join('/');
};

exports.shExpMatch = function (str,match){
	var result = match.replace(/([\/\(\)\[\]\.\?])/g,'\\$1');
    result = result.replace('*','.*');
    var regEx = new RegExp(result);
	return regEx.test(str);
};

exports.mkdirs = function mkdirs(dirpath, mode, callback) {
	path.exists(dirpath, function(exists) {
		if (exists) {
			callback(dirpath);
		} else {
			mkdirs(path.dirname(dirpath), mode, function() {
				fs.mkdir(dirpath, mode, callback);
			});
		}
	});
};


exports.rmdir = function rmdir(dir, callback){
    fs.readdir(dir, function(err, files){
        if (err) return callback(err);
        (function rmFile(err){
            if (err) return callback(err);

            var filename = files.shift();
            if (filename === null || typeof filename == 'undefined')
                return fs.rmdir(dir, callback);

            var file = dir+'/'+filename;
            fs.stat(file, function(err, stat){
                if (err) return callback(err);
                if (stat.isDirectory())
                    rmdir(file, rmFile);
                else
                    fs.unlink(file, rmFile);
            });
        })();
    });
};

exports.cpdir = function copyDirRecursive(srcDir, newDir, clbk) {
    fs.stat(newDir, function(err, newDirStat){
        if (!err) return exports.rmdirRecursive(newDir, function(err){
            copyDirRecursive(srcDir, newDir, clbk);
        });

        fs.stat(srcDir, function(err, srcDirStat){
            if (err) return clbk(err);
            fs.mkdir(newDir, srcDirStat.mode, function(err){
                if (err) return clbk(err);
                fs.readdir(srcDir, function(err, files){
                    if (err) return clbk(err);
                    (function copyFiles(err){
                        if (err) return clbk(err);

                        var filename = files.shift();
                        if (filename === null || typeof filename == 'undefined')
                            return clbk();

                        var file = srcDir+'/'+filename,
                            newFile = newDir+'/'+filename;

                        fs.stat(file, function(err, fileStat){
                            if (fileStat.isDirectory())
                                copyDirRecursive(file, newFile, copyFiles);
                            else if (fileStat.isSymbolicLink())
                                fs.readlink(file, function(err, link){
                                    fs.symlink(link, newFile, copyFiles);
                                });
                            else
                                fs.readFile(file, function(err, data){
                                    fs.writeFile(newFile, data, copyFiles);
                                });
                        });
                    })();
                });
            });
        });
    });
};

exports.delindir=function delindir(dir,step,callback){
	fs.readdir(dir, function(err, list) {
		if (err) return callback(err);
		var pending = list.length;
		if (!pending) return callback(null);
		list.forEach(function(file) {
			if (dir[dir.length - 1] == '/') {
				file = dir + file;
			} else {
				file = dir + '/' + file;
			}
			fs.stat(file, function(err, stat) {
				var needDel = step(file);
				if (stat && stat.isDirectory()) {
					if(needDel){
						exports.rmdir(file,function (err){
							if(err) return callback(err);
							if (!--pending) callback(null);
						});
					}else{
						delindir(file,step,function(err, res) {
							if(err) return callback(err);
							if (!--pending) callback(null);
						});
					}
				} else {
					if(needDel){
						fs.unlink(file, function (err){
							if(err) return callback(err);
							if (!--pending) callback(null);
						});
					}else if (!--pending){
						callback(null);
					}
				}
			});
		});
	});
};

var Queue =function (){
	this.taskList = [];
};
Queue.prototype.add = function (fn,scope){
	scope = scope || this;
	this.taskList.push(fn.bind(scope));
};
Queue.prototype.next = function (param){
	var fn = this.taskList.shift();
	if(!!fn){
		fn(param);
	}
};
Queue.prototype.wait = function (msec){
	var callback = function (param){
		this.next(param);
	};
	this.taskList.push(function (param){
		window.setTimeout(callback.bind(this,param),msec);
	});
};
Queue.prototype.start = function (){
	this.next();
};
exports.Queue = Queue;