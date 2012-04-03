var Backbone = require('/js/lib/backbone');
var backboneLocalstorage = require('./lib/backbone-localstorage');
 // Todo Model
  // ----------

  // Our basic **Todo** model has `text`, `order`, and `done` attributes.
 
 exports.Todo = Backbone.Model.extend({

    // Default attributes for a todo item.
    defaults: function() {
      return {
        done:  false,
        order: Todos.nextOrder()
      };
    },

    // Toggle the `done` state of this todo item.
    toggle: function() {
      this.save({done: !this.get("done")});
    }

  });

  // Todo Collection
  // ---------------

  // The collection of todos is backed by *localStorage* instead of a remote
  // server.
  exports.TodoList = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: exports.Todo,

    // Save all of the todo items under the `"todos"` namespace.
    localStorage: new backboneLocalstorage.Store("todos"),

    // Filter down the list of all todo items that are finished.
    done: function() {
      return this.filter(function(todo){ return todo.get('done'); });
    },

    // Filter down the list to only todo items that are still not finished.
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    // Todos are sorted by their original insertion order.
    comparator: function(todo) {
      return todo.get('order');
    }

  });