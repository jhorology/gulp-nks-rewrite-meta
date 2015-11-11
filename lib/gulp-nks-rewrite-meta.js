(function() {
  var $, PLUGIN_NAME, _, _assertArray, _assertString, _assertTypes, _createChunk, _deserializeChunk, _replaceChunk, _validate, assert, gutil, nksJson, reader, riffBuilder, through,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  assert = require('assert');

  through = require('through2');

  gutil = require('gulp-util');

  _ = require('underscore');

  reader = require('riff-reader');

  nksJson = require('nks-json');

  riffBuilder = require('./riff-builder');

  PLUGIN_NAME = 'bitwig-rewrite-meta';

  $ = {
    chunkId: 'NISI',
    formType: 'NIKS',
    metaItems: ['author', 'bankchain', 'comment', 'modes', 'name', 'types']
  };

  module.exports = function(data) {
    return through.obj(function(file, enc, cb) {
      var error, error1, metadata, obj, rewrite, rewrited;
      rewrited = false;
      rewrite = (function(_this) {
        return function(err, obj) {
          var chunk, error, error1;
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
            chunk = _createChunk(file, obj);
            _replaceChunk(file, chunk);
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
      data = _validate(data);
      metadata = _deserializeChunk(file);
      if (_.isFunction(data)) {
        try {
          obj = data.call(this, file, metadata, rewrite);
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

  _deserializeChunk = function(file) {
    var json, src;
    src = file.isBuffer() ? file.contents : file.path;
    json = void 0;
    reader(src, $.formType).readSync(function(id, data) {
      assert.ok(id === $.chunkId, "Unexpected chunk id. id:" + id);
      assert.ok(_.isUndefined(json), "Duplicate metadata chunk.");
      return json = nksJson.deserializer(data).deserialize();
    }, [$.chunkId]);
    assert.ok(json, $.chunkId + " chunk is not contained in file.");
    file.data = json;
    return json;
  };

  _createChunk = function(file, obj) {
    var key, meta, originalKeys, ref, rewriteKeys, shouldInsertModes, shouldInsertTypes, value;
    originalKeys = _.keys(file.data);
    rewriteKeys = _.keys(obj);
    shouldInsertModes = !(indexOf.call(originalKeys, 'modes') >= 0) && indexOf.call(rewriteKeys, 'modes') >= 0;
    shouldInsertTypes = !(indexOf.call(originalKeys, 'types') >= 0) && indexOf.call(rewriteKeys, 'types') >= 0;
    meta = {};
    ref = file.data;
    for (key in ref) {
      value = ref[key];
      if (shouldInsertModes && key === 'name') {
        chunk.pushKeyValue('modes', obj.modes);
        meta.modes = obj.modes;
      }
      if (indexOf.call(rewriteKeys, key) >= 0) {
        meta[key] = obj[key];
      } else {
        meta[key] = value;
      }
      if (shouldInsertTypes && key === 'name') {
        chunk.pushKeyValue('types', obj.types);
        meta.types = obj.types;
      }
    }
    file.data = meta;
    return nksJson.serializer(meta).serialize().buffer();
  };

  _replaceChunk = function(file, chunk) {
    var riff, src;
    riff = riffBuilder($.formType);
    src = file.isBuffer() ? file.contents : file.path;
    reader(src, $.formType).readSync(function(id, data) {
      if (id === $.chunkId) {
        return riff.pushChunk(id, chunk);
      } else {
        return riff.pushChunk(id, data);
      }
    });
    return file.contents = riff.buffer();
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
