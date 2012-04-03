var $ = require('./lib/jquery').$;
var model = require('./model');
var view = require('./view');
var coffee = require('./test');
$(function(){	
	coffee.fn('coffee');
	window.Todos = new model.TodoList;
	window.App = new view.AppView;
});