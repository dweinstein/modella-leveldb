/**
 * Module dependencies
 */

var debug = require('debug')('modella:leveldb');
var sublevel = require('level-sub');
var level = require('level-11');
var sync = {};

/**
 * Export `LevelDB`
 */

module.exports = function(path, options) {
  options = options || {};
  options.valueEncoding = options.valueEncoding || 'json';

  var db = level(path, options);

  // automatically cleanup on termination
  process.on('SIGTERM', db.close.bind(this));

  return function(model) {
    model.db = sublevel(db).sublevel('modella').sublevel(model.modelName);
    for (fn in sync) model[fn] = sync[fn];
  };
};

/**
 * All
 */

sync.all = function(options, fn) {
  var model = this;

  if (arguments.length == 1) {
    fn = options;
    options = {};
  }

  debug('getting all data with options %j', options);
  var rs = this.db.createReadStream(options);
  var buffer = [];

  rs.on('error', function(err) {
    return fn(err);
  });

  rs.on('data', function(data) {
    buffer[buffer.length] = data.value;
  });

  rs.on('end', function() {
    return fn(null, buffer.map(model));
  });
};

/**
 * Get
 */

sync.get =
sync.find = function(key, options, fn) {
  var db = this.db;
  var model = this;

  if(arguments.length == 2) {
    fn = options;
    options = {};
  }

  debug('getting %j with %j options...', key, options);
  db.get(key, options, function(err, json) {
    if(err) return fn(err);
    else if(!json) return fn(null, false);
    debug('got %j', json);
    return fn(null, model(json));
  });
};

/**
 * removeAll
 */

sync.removeAll = function(query, fn) {
  throw new Error('model.removeAll not implemented');
};

/**
 * save
 */

sync.save =
sync.update = function(options, fn) {
  if (1 == arguments.length) {
    fn = options;
    options = {};
  }

  var json = this.toJSON();
  debug('saving... %j', json);
  var id = this.primary();
  this.model.db.put(id, json, function(err) {
    if(err) return fn(err);
    debug('saved %j', json);
    return fn(null, json);
  });
};

/**
 * remove
 */

sync.remove = function(options, fn) {
  if (1 == arguments.length) {
    fn = options;
    options = {};
  }

  var db = this.model.db;
  var id = this.primary();
  debug('removing %s with options %j', id, options);
  db.del(id, options, function(err) {
    if(err) return fn(err);
    debug('removed %s', id);
    return fn();
  });
};
