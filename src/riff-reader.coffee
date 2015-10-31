# RIFF reader
#
# @ref https://msdn.microsoft.com/en-us/library/windows/desktop/dd798636(v=vs.85).aspx

assert = require 'assert'
fs     = require 'fs'
_      = require 'underscore'

# function(file, formType)
#
# - file     String filepath or content buffer
# - formtype 4 characters id
module.exports = (file, formType) ->
  new RIFFReader file, formType

class RIFFReader
  # new RIFFReader(file, formType)
  #
  # - file     String filepath or content buffer
  # - formType 4 characters id
  constructor: (file, formType) ->
    if _.isString file
      @filepath = file
    else
      @buf = file
    @pos = 0
    header = @_read 12
    magic = header.toString 'utf8', 0, 4
    assert.ok (magic is 'RIFF'), "Invalid file. magic:#{magic}"
    @fileSize = (header.readUInt32LE 4) + 8
    @formType = header.toString 'ascii', 8, 12
    assert.ok (@formType is formType), "Invalid file. form type:#{@formType}"

  # read(callback, [subscribeIds])
  #
  # - callback     function(chunkId, data)
  # - subscribeIds array of chunk id. *optional
  read: (callback, subscribeIds) ->
    while @pos < @fileSize
      @_readChunk callback, subscribeIds
    @

  _readChunk: (callback, subscribeIds) ->
    header = @_read 8
    id = header.toString 'ascii', 0, 4
    size = header.readUInt32LE 4
    if subscribeIds and not (id in subscribeIds)
      @_skip size
    else
      data = @_read size
      callback.call @, id, data
    # skip padding byte for 16bit boundary
    @_skip 1 if size & 0x01
    @

  _skip: (len) ->
    @pos += len
    @

  _read: (len) ->
    if @filepath
      @_readFile len
    else
      @_readBuffer len

  _readFile: (len) ->
    ret = new Buffer len
    fd = fs.openSync @filepath, 'r'
    bytesRead = fs.readSync fd, ret, 0, len, @pos
    fs.closeSync fd
    assert.ok  (bytesRead is len), "File read error. bytesRead:#{bytesRead} expected bytes:#{len}"
    @pos += len
    ret

  _readBuffer: (len) ->
    ret = @buf.slice @pos, @pos + len
    @pos += len
    ret
