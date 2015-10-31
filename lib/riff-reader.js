(function() {
  var RIFFReader, _, assert, fs,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  assert = require('assert');

  fs = require('fs');

  _ = require('underscore');

  module.exports = function(file, formType) {
    return new RIFFReader(file, formType);
  };

  RIFFReader = (function() {
    function RIFFReader(file, formType) {
      var header, magic;
      if (_.isString(file)) {
        this.filepath = file;
      } else {
        this.buf = file;
      }
      this.pos = 0;
      header = this._read(12);
      magic = header.toString('utf8', 0, 4);
      assert.ok(magic === 'RIFF', "Invalid file. magic:" + magic);
      this.fileSize = (header.readUInt32LE(4)) + 8;
      this.formType = header.toString('ascii', 8, 12);
      assert.ok(this.formType === formType, "Invalid file. form type:" + this.formType);
    }

    RIFFReader.prototype.read = function(callback, subscribeIds) {
      while (this.pos < this.fileSize) {
        this._readChunk(callback, subscribeIds);
      }
      return this;
    };

    RIFFReader.prototype._readChunk = function(callback, subscribeIds) {
      var data, header, id, size;
      header = this._read(8);
      id = header.toString('ascii', 0, 4);
      size = header.readUInt32LE(4);
      if (subscribeIds && !(indexOf.call(subscribeIds, id) >= 0)) {
        this._skip(size);
      } else {
        data = this._read(size);
        callback.call(this, id, data);
      }
      if (size & 0x01) {
        this._skip(1);
      }
      return this;
    };

    RIFFReader.prototype._skip = function(len) {
      this.pos += len;
      return this;
    };

    RIFFReader.prototype._read = function(len) {
      if (this.filepath) {
        return this._readFile(len);
      } else {
        return this._readBuffer(len);
      }
    };

    RIFFReader.prototype._readFile = function(len) {
      var bytesRead, fd, ret;
      ret = new Buffer(len);
      fd = fs.openSync(this.filepath, 'r');
      bytesRead = fs.readSync(fd, ret, 0, len, this.pos);
      fs.closeSync(fd);
      assert.ok(bytesRead === len, "File read error. bytesRead:" + bytesRead + " expected bytes:" + len);
      this.pos += len;
      return ret;
    };

    RIFFReader.prototype._readBuffer = function(len) {
      var ret;
      ret = this.buf.slice(this.pos, this.pos + len);
      this.pos += len;
      return ret;
    };

    return RIFFReader;

  })();

}).call(this);
