var util = require('./util');

var http = require('http');
var Url = require('url');

function getUrlParams(str) {
    var result = {};
    var search = str.split('?');
    if (search.length === 0) {
      return result;
    }
    var arr = search[1].split('&');
    for (var i = 0, l = arr.length; i < l; i++) {
      var kv = arr[i].split('=');
      result[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
    }
    return result;
  };

function proxy(preq, pres) {
  pres.setHeader('Pragma', '0');
  pres.setHeader('Cache-Control', 'no-cache');
  pres.setHeader('Expires', '0');

  var method = preq.method;

  var params = getUrlParams(preq.url),
    url;
  if ( !! params.url) {
    url = params.url;
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

  var ret = Url.parse(url);
  delete preq.headers.host;
  delete preq.headers['x-requested-with'];

  var headers = preq.headers;
  headers['connection'] = 'close';

  var options = {
    host: ret.host,
    port: ret.port,
    path: ret.path,
    method: method,
    headers: headers
  };


  var req = http.request(options, function(res) {
    for (var item in res.headers) {
      if (res.headers.hasOwnProperty(item)) {
        pres.setHeader(item, res.headers[item]);
      }
    }    
    res.on('data', function(chunk) {
      pres.write(chunk, 'utf8');
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