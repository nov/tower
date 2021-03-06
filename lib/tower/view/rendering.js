
Tower.View.Rendering = {
  render: function(options, callback) {
    var type,
      _this = this;
    if (!options.type && options.template && typeof options.template === 'string' && !options.inline) {
      type = options.template.split('/');
      type = type[type.length - 1].split(".");
      type = type.slice(1).join();
      options.type = type !== '' ? type : this.constructor.engine;
    }
    options.type || (options.type = this.constructor.engine);
    if (!options.hasOwnProperty("layout") && this._context.layout) {
      options.layout = this._context.layout();
    }
    options.locals = this._renderingContext(options);
    return this._renderBody(options, function(error, body) {
      if (error) {
        return callback(error, body);
      }
      return _this._renderLayout(body, options, callback);
    });
  },
  partial: function(path, options, callback) {
    var prefixes, template;
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    options || (options = {});
    prefixes = options.prefixes;
    if (this._context) {
      prefixes || (prefixes = [this._context.collectionName]);
    }
    template = this._readTemplate(path, prefixes, options.type || Tower.View.engine);
    return this._renderString(template, options, callback);
  },
  renderWithEngine: function(template, engine) {
    var mint;
    if (Tower.client) {
      return "(" + template + ").call(this);";
    } else {
      mint = require("mint");
      return mint[mint.engine(engine || "coffee")](template, {}, function(error, result) {
        if (error) {
          return console.log(error);
        }
      });
    }
  },
  _renderBody: function(options, callback) {
    if (options.text) {
      return callback(null, options.text);
    } else if (options.json) {
      return callback(null, typeof options.json === "string" ? options.json : JSON.stringify(options.json));
    } else {
      if (!options.inline) {
        options.template = this._readTemplate(options.template, options.prefixes, options.type);
      }
      return this._renderString(options.template, options, callback);
    }
  },
  _renderLayout: function(body, options, callback) {
    var layout;
    if (options.layout) {
      layout = this._readTemplate("layouts/" + options.layout, [], options.type);
      options.locals.body = body;
      return this._renderString(layout, options, callback);
    } else {
      return callback(null, body);
    }
  },
  _renderString: function(string, options, callback) {
    var coffeekup, e, engine, hardcode, helper, locals, mint, result, tags, _i, _len, _ref;
    if (options == null) {
      options = {};
    }
    if (!!options.type.match(/coffee/)) {
      e = null;
      result = null;
      coffeekup = Tower.client ? global.CoffeeKup : require("coffeekup");
      try {
        locals = options.locals;
        locals.renderWithEngine = this.renderWithEngine;
        locals._readTemplate = this._readTemplate;
        locals.cache = Tower.env !== "development";
        locals.format = true;
        hardcode = {};
        _ref = Tower.View.helpers;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          helper = _ref[_i];
          hardcode = _.extend(hardcode, helper);
        }
        tags = coffeekup.tags;
        hardcode = _.extend(hardcode, {
          tags: tags
        });
        locals.hardcode = hardcode;
        locals._ = _;
        result = coffeekup.render(string, locals);
      } catch (error) {
        e = error;
        console.log(e.stack);
      }
      return callback(e, result);
    } else if (options.type) {
      mint = require("mint");
      if (typeof string === 'function') {
        string = string();
      }
      engine = mint.engine(options.type);
      if (engine.match(/(eco|mustache)/)) {
        return mint[engine](string, options, callback);
      } else {
        return mint[engine](string, options.locals, callback);
      }
    } else {
      mint = require("mint");
      engine = require("mint");
      options.locals.string = string;
      return engine.render(options.locals, callback);
    }
  },
  _renderingContext: function(options) {
    var key, locals, value, _ref;
    locals = this;
    _ref = this._context;
    for (key in _ref) {
      value = _ref[key];
      if (!key.match(/^(constructor|head)/)) {
        locals[key] = value;
      }
    }
    locals = _.modules(locals, options.locals);
    if (this.constructor.prettyPrint) {
      locals.pretty = true;
    }
    return locals;
  },
  _readTemplate: function(template, prefixes, ext) {
    var cachePath, options, path, result, store;
    if (typeof template !== "string") {
      return template;
    }
    options = {
      path: template,
      ext: ext,
      prefixes: prefixes
    };
    store = this.constructor.store();
    if (typeof store.findPath !== 'undefined') {
      path = store.findPath(options);
      path || (path = store.defaultPath(options));
    } else {
      path = template;
    }
    cachePath = path;
    result = this.constructor.cache[cachePath] || require('fs').readFileSync(path, 'utf-8').toString();
    if (!result) {
      throw new Error("Template '" + template + "' was not found.");
    }
    return result;
  }
};

module.exports = Tower.View.Rendering;
