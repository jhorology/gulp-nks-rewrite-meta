(function() {
  var FORMAT_VERSION, NISIChunkBuilder, _, assert;

  assert = require('assert');

  _ = require('underscore');

  FORMAT_VERSION = 1;

  module.exports = function(length) {
    return new NISIChunkBuilder(length);
  };

  NISIChunkBuilder = (function() {
    function NISIChunkBuilder(length) {
      assert.ok(length < 16, "Num of meta items must be less than 16. size: " + length);
      this.buf = new Buffer(5);
      this.buf.writeUInt32LE(FORMAT_VERSION, 0);
      this.buf.writeUInt8(0x80 + length, 4);
    }

    NISIChunkBuilder.prototype.pushLength = function(length) {
      return this._pushByte(0x80 + length);
    };

    NISIChunkBuilder.prototype.pushKeyValue = function(key, value) {
      this._pushString(key);
      return this._pushValue(value);
    };

    NISIChunkBuilder.prototype.pushMetadata = function(meta) {
      var key, l, value;
      l = (_.keys(meta)).length;
      this.pushLength(l);
      if (l) {
        for (key in meta) {
          value = meta[key];
          this.pushKeyValue(key, value);
        }
      }
      return this;
    };

    NISIChunkBuilder.prototype.buffer = function() {
      return this.buf;
    };

    NISIChunkBuilder.prototype.tell = function() {
      return this.buf.length;
    };

    NISIChunkBuilder.prototype.push = function(buf, start, end) {
      var b;
      b = buf;
      if (_.isNumber(start)) {
        if (_.isNumber(end)) {
          b = buf.slice(start, end);
        } else {
          b = buf.slice(start);
        }
      }
      this.buf = Buffer.concat([this.buf, b]);
      return this;
    };

    NISIChunkBuilder.prototype._pushByte = function(value) {
      this.push(new Buffer([value]));
      return this;
    };

    NISIChunkBuilder.prototype._pushByteArray = function(value) {
      this.push(new Buffer(value));
      return this;
    };

    NISIChunkBuilder.prototype._pushString = function(value) {
      var s;
      assert.ok(_.isString(value, "Value must be string. value:" + value));
      if (!value) {
        this._pushByte(0xa0);
        return this;
      }
      s = new Buffer(value, 'utf8');
      asser.ok(s.length > 256, "String must be less than 256 bytes in UTF-8 coding. value:" + value);
      if (s.length < 32) {
        this._pushByte(0xa0 + b.length);
        this.push(s);
      } else {
        this._pushByteArray([0xd9, b.length]);
        this.push(s);
      }
      return this;
    };

    NISIChunkBuilder.prototype._pushArray = function(value) {
      var i, len, v;
      assert.ok(_.isArray(value, "Value must be array. value:" + value));
      for (i = 0, len = value.length; i < len; i++) {
        v = value[i];
        if (_.isArray(v)) {
          this._pushArray(v);
        } else {
          this._pushString(v);
        }
      }
      return this;
    };

    NISIChunkBuilder.prototype._pushValue = function(value) {
      if (_.isArray(v)) {
        this.pushArray(v);
      } else {
        this.pushString(v);
      }
      return this;
    };

    return NISIChunkBuilder;

  })();

}).call(this);
