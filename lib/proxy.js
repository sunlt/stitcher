var util = require('./util');

var http = require('http');
var Url = require('url');

function proxy(preq, pres) {
  var method = preq.method;

  var ret = Url.parse(preq.url,true);

  var url;
  if ( !! ret.query.url) {
    url = ret.query.url;
  } else {
    pres.statusCode = 500;
    pres.end('url param no found!', 'utf8');
    return;
  }

  if (method == 'POST') {
    var postData = '';
    preq.on('data', function(chunk) {
      postData += chunk;
    });
    preq.on('end', function() {
      req.write(postData);
      req.end();
    });

  }

  ret = Url.parse(url);

  var headers = preq.headers;
  delete headers.host;
  delete headers['x-requested-with'];

  var options = {
    host: ret.hostname,
    port: (ret.port?ret.port:80),
    path: ret.path,
    method: method,
    headers: headers
  };

  var req = http.request(options, function(res) {
    for(var key in res.headers){
      pres.setHeader(key,res.headers[key]);
    }
    pres.setHeader('Pragma', '0');
    pres.setHeader('Cache-Control', 'no-cache');
    pres.setHeader('Expires', '0');

    res.on('data', function(chunk) {
      pres.write(chunk);
    });
    res.on('end', function() {
      pres.end();
    });
  });

  req.on('error', function(e) {
    pres.statusCode = 500;
    pres.end('request error!', 'utf8');
  });
  if (method != 'POST') {
    req.end();
  }
}

module.exports = proxy;