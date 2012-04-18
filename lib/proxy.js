var util = require('./util');
var http = require('http');
var connect = require('connect');

var getUrlParams = function(str) {
    var result = {};
    var search = str.split('?');
    if(search.length === 0){
      return result;
    }
    var arr = search[1].split('&');
    for (var i = 0, l = arr.length; i < l; i++) {
      var kv = arr[i].split('=');
      result[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
    }
    return result;
  };

  function parseURL(url){
   var ret = {},
      reg = /^(\w+):\/\/([^\/:]+):?(\d*)?([^#\?]*)(\?[^#]*)?#?(\w+)?/g;
   url.replace(reg, function(all,protocol,host,port,path,params,hash){
      ret.protocol = protocol;
      ret.host = host;
      ret.port = port||80;
      ret.path = path + (params||'');
      ret.query=params;
      ret.hash=hash;
     
      (function(){
         if(params===undefined)return;
         var o = {},
            seg = params.replace(/^\?/,'').split('&'),
            len = seg.length,
            i = 0,
            s;
         for (;i<len;i++){
            if (!seg[i]){ continue; }
            s = seg[i].split('=');
            o[s[0]] = s[1];
         }
         ret.params=o;
      })();
     
   });
   return ret;
}


function proxy(preq, pres) {
  pres.setHeader('Pragma', '0');
  pres.setHeader('Cache-Control', 'no-cache');
  pres.setHeader('Expires', '0');

  var method = preq.method;
  
  var params = getUrlParams(preq.url),url;
  if ( !!params.url) {
    url = params.url;
  } else {
    pres.statusCode = 500;
    pres.end('url param no found!', 'utf8');
    return;
  }
  
  if(method == 'POST'){
    var postData = '' ;
    preq.on('data',function (chunk){
      postData+=chunk;
    });
    preq.on('end',function (){
      req.write(postData);
      req.end();
    });

  }

  var ret = parseURL(url);
  delete preq.headers.connection;
  delete preq.headers.host;
  delete preq.headers['x-requested-with'];
  delete preq.headers['referer'];

  var headers = preq.headers;
  headers['connection'] = 'close';
  
  var options = {
    host: ret.host,
    port: ret.port,
    path: ret.path,
    method: method,
    headers:headers
  };
  

  var req = http.request(options, function(res) {
    var contentType = res.headers['content-type'];
    var arr = contentType.split(';');
    var encode = arr.length>0?arr[1]:'utf8';
    for(var item in res.headers){
      if(res.headers.hasOwnProperty(item)){
        pres.setHeader(item,res.headers[item]);
      }
    }

    res.on('data', function(chunk) {
      pres.write(chunk,encode);
    });
    res.on('end',function (){
      pres.end();
    });
  });

  req.on('error', function(e) {
    pres.statusCode = 404;
    pres.end('request error!','utf8');
  });
  if(method != 'POST'){
    req.end();
  }
}

module.exports = proxy;
