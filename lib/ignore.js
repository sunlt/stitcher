var fs = require('fs');
var path = require('path');


var glob = ['.DS_Store','npm-debug.log','Thumbs.db','*.bak','*_bak','*/.svn/','*/.git/','*/.cvs/'];

function addIgnore(list) {  
  var rules = [];
  list = list.concat(glob);
  var reg1 = /\*/g,
    reg2 = /([\[\]\{\}\(\)\.\?\+\-\/])/g;
  
  for (var i = 0, len = list.length, line; i < len; i++) {
    line = list[i].trim();
    if (line === '' || line.indexOf('#') === 0) {
      continue;
    }
    rules.push(new RegExp(['^', line.replace(reg2, '\\$1').replace(reg1, '.*'), '$'].join('')));
  }
  return rules;
};

function walk(dir, ignoreRules, done) {
  var rules = addIgnore(ignoreRules);

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

      for (var i = 0, len = rules.length; i < len; i++) {
        if (rules[i].test(file) || rules[i].test(file + '/')) {
          if (!--pending) done(null, results);
          return;
        }
      }

      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file,ignoreRules, function(err, res) {
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


module.exports = function (dir_path,ignores,filters,cb,scope){
  scope = scope || this;
  walk(dir_path,ignores,function (error,files){
    if(error) {cb.call(scope,error);return;}

    var rev = files.filter(function (f){
      return filters.indexOf(path.extname(f)) != -1;
    });
    cb.call(scope,null,rev);
  });

};


module.exports('/stitcher',['*/node_modules/'],['.js'],function (err,files){
  console.log(files)
});