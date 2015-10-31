(function() {
  var $, PLUGIN_NAME, _, _assertArray, _assertString, _assertTypes, _parseMeta, _rewriteMeta, _validate, assert, builder, chunkBuilder, chunkParser, gutil, reader, through,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  assert = require('assert');

  through = require('through2');

  gutil = require('gulp-util');

  _ = require('underscore');

  reader = require('./riff-reader');

  builder = require('./riff-builder');

  chunkParser = require('./nisi-chunk-parser');

  chunkBuilder = require('./nisi-chunk-builder');

  PLUGIN_NAME = 'bitwig-rewrite-meta';

  $ = {
    chunkId: 'NISI',
    formType: 'NIKS',
    metaItems: ['author', 'bankchain', 'comment', 'modes', 'name', 'types']
  };

  module.exports = function(data) {
    return through.obj(function(file, enc, cb) {
      var error, error1, obj, rewrite, rewrited;
      rewrited = false;
      rewrite = (function(_this) {
        return function(err, obj) {
          var error, error1;
          if (rewrited) {
            _this.emit('error', new gutil.PluginError(PLUGIN_NAME, 'duplicate callback'));
            return;
          }
          rewrited = true;
          if (err) {
            _this.emit('error', new gutil.PluginError(PLUGIN_NAME, err));
            return cb();
          }
          try {
            _rewriteMeta(file, obj);
            _this.push(file);
          } catch (error1) {
            error = error1;
            _this.emit('error', new gutil.PluginError(PLUGIN_NAME, error));
          }
          return cb();
        };
      })(this);
      if (!file) {
        rewrite('Files can not be empty');
        return;
      }
      if (file.isStream()) {
        rewrite('Streaming not supported');
        return;
      }
      if (_.isFunction(data)) {
        try {
          obj = data.call(this, file, _parseMeta(file), rewrite);
        } catch (error1) {
          error = error1;
          rewrite(error);
        }
        if (data.length <= 2) {
          return rewrite(void 0, obj);
        }
      } else {
        return rewrite(void 0, data);
      }
    });
  };

  _parseMeta = function(file) {
    var ret, src;
    src = file.isBuffer() ? file.contents : file.path;
    ret = void 0;
    reader(src, $.formType).read(function(id, data) {
      assert.ok(id === $.chunkId, "Unexpected chunk id. id:" + id);
      assert.ok(_.isUndefined(ret), "Duplicate metadata chunk.");
      return ret = chunkParser(data).parse();
    }, [$.chunkId]);
    assert.ok(ret, $.chunkId + " chunk is not contained in file.");
    file.data = ret;
    return ret;
  };

  _rewriteMeta = function(file, obj) {
    var arg, bldr, meta;
    obj = _validate(obj);
    arg = file.isBuffer() ? file.contents : file.path;
    bldr = builder($.formType);
    meta = {};
    reader(arg, $.formType).read(function(id, data) {
      var chunk, keys;
      if (id === $.chunkId) {
        keys = _.keys(obj);
        chunk = chunkBuilder(_.keys(file.data).length);
        chunkParser(data).parse(function(key, value, buf) {
          if (indexOf.call(keys, key) >= 0) {
            chunk.pushKeyValue(key, obj[key]);
            return meta[key] = obj[key];
          } else {
            chunk.push(buf);
            return meta[key] = value;
          }
        });
        return bldr.pushChunk(id, chunk.buffer());
      } else {
        return bldr.pushChunk(id, data);
      }
    });
    file.contents = bldr.buffer();
    return file.data = meta;
  };

  _validate = function(obj) {
    var key, value;
    obj = obj || {};
    for (key in obj) {
      value = obj[key];
      switch (key) {
        case 'author':
        case 'comment':
        case 'name':
          _assertString(key, value);
          break;
        case 'bankchain':
          _assertArray(key, value, true, 3);
          break;
        case 'modes':
          _assertArray(key, value, false, 16);
          break;
        case 'types':
          _assertTypes(key, value);
          break;
        default:
          assert.ok(false, "Unsupported option " + key + ".");
      }
    }
    return obj;
  };

  _assertString = function(key, value) {
    return assert.ok(_.isString(value), "Option " + key + " must be string. " + key + ":" + value);
  };

  _assertArray = function(key, value, equal, size) {
    var i, len, results, s;
    assert.ok(_.isArray(value), "Option " + key + " must be array or string. " + key + ":" + value);
    if (equal) {
      assert.ok(value.length === size, "Option " + key + " array length must be " + size + ". " + key + ":" + value);
    } else {
      assert.ok(value.length < size, "Option " + key + " array length must be less than " + size + ". " + key + ":" + value);
    }
    results = [];
    for (i = 0, len = value.length; i < len; i++) {
      s = value[i];
      results.push(assert.ok(_.isString(s), "Option " + key + " must be array of string. " + key + ":" + value));
    }
    return results;
  };

  _assertTypes = function(key, value) {
    var ar, i, len, results, s;
    assert.ok(_.isArray(value), "Option " + key + " must be 2 dimensional array or string. " + key + ":" + value);
    assert.ok(value.length < 16, "Option " + key + " array length must be less than (16,3). " + key + ":" + value);
    results = [];
    for (i = 0, len = value.length; i < len; i++) {
      ar = value[i];
      assert.ok(_.isArray(ar), "Option " + key + " must be 2 dimensional array of string. " + key + ":" + value);
      assert.ok(ar.length < 3, "Option " + key + " array length must be less than (16,3). " + key + ":" + value);
      results.push((function() {
        var j, len1, results1;
        results1 = [];
        for (j = 0, len1 = ar.length; j < len1; j++) {
          s = ar[j];
          results1.push(assert.ok(_.isString(s), "Option " + key + " must be 2 dimensional array of string. " + key + ":" + value));
        }
        return results1;
      })());
    }
    return results;
  };

}).call(this);
