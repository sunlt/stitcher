var fs = require('fs');
var path = require('path');


function rmdir(path, failSilent) {
  var files;
  try {
    files = fs.readdirSync(path);
  } catch (err) {
    if (failSilent) return;
    throw new Error(err.message);
  }
  for (var i = 0; i < files.length; i++) {
    var currFile = fs.lstatSync(path + "/" + files[i]);
    if (currFile.isDirectory()) rmdir(path + "/" + files[i]);
    else if (currFile.isSymbolicLink()) fs.unlinkSync(path + "/" + files[i]);
    else fs.unlinkSync(path + "/" + files[i]);
  }
  return fs.rmdirSync(path);
}
exports.rmdir = rmdir;


function copyDir(sourceDir, newDirLocation, opts) {
  if (!opts || !opts.preserve) {
    try {
      if (fs.statSync(newDirLocation).isDirectory()) rmdir(newDirLocation);
    } catch (e) {}
  }
  var checkDir = fs.statSync(sourceDir);
  try {
    fs.mkdirSync(newDirLocation, checkDir.mode);
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
  var files = fs.readdirSync(sourceDir);

  for (var i = 0; i < files.length; i++) {
    var currFile = fs.lstatSync(sourceDir + "/" + files[i]);

    if (currFile.isDirectory()) {
      copyDir(sourceDir + "/" + files[i], newDirLocation + "/" + files[i], opts);
    } else if (currFile.isSymbolicLink()) {
      var symlinkFull = fs.readlinkSync(sourceDir + "/" + files[i]);
      fs.symlinkSync(symlinkFull, newDirLocation + "/" + files[i]);
    } else {
      var contents = fs.readFileSync(sourceDir + "/" + files[i]);
      fs.writeFileSync(newDirLocation + "/" + files[i], contents);
    }
  }
}
exports.copyDir = copyDir;

function mkdir(path, mode) {
  var self = this;
  try {
    fs.mkdirSync(path, mode);
  } catch (err) {
    if (err.code == "ENOENT") {
      var slashIdx = path.lastIndexOf("/");
      if (slashIdx < 0) {
        slashIdx = path.lastIndexOf("\\");
      }

      if (slashIdx > 0) {
        var parentPath = path.substring(0, slashIdx);
        mkdir(parentPath, mode);
        mkdir(path, mode);
      } else {
        throw err;
      }
    } else if (err.code == "EEXIST") {
      return;
    } else {
      throw err;
    }
  }
};
exports.mkdir = mkdir;


var cache = {};
exports.tmpl = function tmpl(str, data) {
  // Figure out if we're getting a template, or if we need to
  // load the template - and be sure to cache the result.
  var fn = !/\W/.test(str) ? cache[str] = cache[str] || tmpl(document.getElementById(str).innerHTML) :

  // Generate a reusable function that will serve as a template
  // generator (and which will be cached).
  new Function("obj", "var p=[],print=function(){p.push.apply(p,arguments);};" +

  // Introduce the data as local variables using with(){}
  "with(obj){p.push('" +

  // Convert the template into pure JavaScript
  str.replace(/[\r\t\n]/g, " ").split("<%").join("\t").replace(/((^|%>)[^\t]*)'/g, "$1\r").replace(/\t=(.*?)%>/g, "',$1,'").split("\t").join("');").split("%>").join("p.push('").split("\r").join("\\'") + "');}return p.join('');");

  // Provide some basic currying to the user
  return data ? fn(data) : fn;
};


function Queue() {
  this.taskList = [];
}
Queue.prototype.add = function(fn, scope) {
  scope = scope || this;
  this.taskList.push(fn.bind(scope));
};
Queue.prototype.next = function(param) {
  var fn = this.taskList.shift();
  if ( !! fn) {
    fn(param);
  }
};
Queue.prototype.wait = function(msec) {
  var callback = function() {
      this.next();
    };
  this.add(function() {
    window.setTimeout(callback.bind(this), msec);
  }, this);
};
Queue.prototype.start = function() {
  this.next();
};

Queue.prototype.clear = function() {
  this.taskList = [];
};
exports.Queue = Queue;


function Parallel(callback,scope){
  this.taskList = [];
  this.results = [];
  this.callScope = scope || this;
  this.callback = callback;
}
Parallel.prototype.add = function(fn,scope) {
  scope = scope || this;
  this.taskList.push(fn.bind(scope));
};
Parallel.prototype.start = function() {
  this.taskList.forEach(function (item,i){
    item(function (result){
      this.results.push({index:i,result:result});
      if(this.results.length == this.taskList.length){
        this.results = this.results.sort(function (item){
          return item.index;
        });
        var arg = [];
        this.results.forEach(function (item){
          arg.push(item.result);
        });
        var args = [].concat([this.results],arg);
        this.callback.apply(this.callScope,args);
      }
    }.bind(this));
  }.bind(this));
};
exports.Parallel = Parallel;