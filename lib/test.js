var less = require('less');
var fs = require('fs');


var less_str = fs.readFileSync('/Users/sun391/workspace/stitcher/examples/Todos/css/test.less', 'utf-8');

var parser = new(less.Parser)({
    paths: ['/Users/sun391/workspace/stitcher/examples/Todos/css/'], // Specify search paths for @import directives
    filename: 'test.less' // Specify a filename, for better error messages
});

parser.parse(less_str, function (e, tree) {
    var css = tree.toCSS({ compress: false }); // Minify CSS output
    console.log(css);
});