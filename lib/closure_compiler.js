var path = require('path');
var spawn = require('child_process').spawn;

var jarPath = path.join(__dirname,'../assets/compiler.jar');
var args = ['-jar',jarPath];
var options = {
	charset:'UTF-8',
	compilation_level:'SIMPLE_OPTIMIZATIONS'
};
function compress(code,callback){
	for(var i in options){
		args.push('--'+i);
		args.push(options[i]);
	}
	compiler = spawn('java',args);
	compiler.stdout.setEncoding('utf8');
	compiler.stderr.setEncoding('utf8');
	var stdout='',stderr='';
	compiler.stdout.on('data',function (data){
		stdout += data;
	});
	compiler.stderr.on('data',function (data){
		stderr += data;
	});
	compiler.on('exit',function (code){
		var error;
		if (code !== 0) {
		  error = new Error(stderr);
		  error.code = code;
		} else {
		  error = null;
		}
		callback(error, stdout);
	});
	compiler.stdin.end(code);
}
exports.compress = compress;