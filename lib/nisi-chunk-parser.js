(function() {
  var FORMAT_VERSION, NISIChunkParser, _, _toHexByte, assert;

  assert = require('assert');

  _ = require('underscore');

  FORMAT_VERSION = 1;

  module.exports = function(data) {
    return new NISIChunkParser(data);
  };

  NISIChunkParser = (function() {
    function NISIChunkParser(data) {
      this.buf = data;
      this.pos = 0;
      this.marker = 0;
    }

    NISIChunkParser.prototype.parse = function(callback) {
      var i, j, key, ref, ret, type, value, version;
      version = this._readUInt32LE();
      assert.ok(version === FORMAT_VERSION, "Unknown NISI format version. version:" + version);
      type = this._readByte();
      assert.ok((type & 0xf0) === 0x80, "NISI chunk must start with 0x8x. value:" + (_toHexByte(type)));
      ret = {};
      for (i = j = 0, ref = type & 0x0f; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
        this.mark();
        key = this._readKey();
        value = this._readValue();
        if (_.isFunction(callback)) {
          callback.call(this, key, value, this.mark());
        }
        ret[key] = value;
      }
      return ret;
    };

    NISIChunkParser.prototype.mark = function() {
      var ret;
      ret = this.buf.slice(this.marker, this.pos);
      this.marker = this.pos;
      return ret;
    };

    NISIChunkParser.prototype._readKey = function() {
      return this._readString(this._readByte());
    };

    NISIChunkParser.prototype._readValue = function() {
      var i, j, ref, results, type;
      type = this._readByte();
      if ((type & 0xf0) === 0x90) {
        results = [];
        for (i = j = 0, ref = type & 0x0f; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          results.push(this._readValue());
        }
        return results;
      } else {
        return this._readString(type);
      }
    };

    NISIChunkParser.prototype._readByte = function() {
      var ret;
      ret = this.buf[this.pos];
      this.pos += 1;
      return ret;
    };

    NISIChunkParser.prototype._readUInt32LE = function() {
      var ret;
      ret = this.buf.readUInt32LE(this.pos);
      this.pos += 4;
      return ret;
    };

    NISIChunkParser.prototype._readUInt16BE = function() {
      var ret;
      ret = this.buf.readUInt16BE(this.pos);
      this.pos += 2;
      return ret;
    };

    NISIChunkParser.prototype._readString = function(type) {
      var length, ret;
      length = void 0;
      switch (type >>> 4) {
        case 0x0a:
          length = type & 0x0f;
          break;
        case 0x0b:
          length = type & 0x1f;
          break;
        case 0x0d:
          switch (type) {
            case 0xd9:
              length = this._readByte();
              break;
            case 0xda:
              length = this._readUInt16BE();
          }
      }
      assert.ok(_.isNumber(length), "Unsupported value type. type:" + (_toHexByte(type)));
      if (!length) {
        return '';
      }
      ret = this.buf.toString('utf8', this.pos, this.pos + length);
      this.pos += length;
      return ret;
    };

    return NISIChunkParser;

  })();

  _toHexByte = function(value) {
    return "0x" + ("0" + (value.toString(16))).slice(-2);
  };

}).call(this);
