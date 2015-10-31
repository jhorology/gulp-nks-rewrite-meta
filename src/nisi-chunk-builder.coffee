assert = require 'assert'
_      = require 'underscore'

FORMAT_VERSION = 1

# function([length])
#
# - length  num of meta items *optional
# - return  instance of builder
module.exports = (length) ->
  new NISIChunkBuilder length

class NISIChunkBuilder
  # new NISIChunkBuilder(length)
  #
  # - length    num of meta items.
  constructor: (length) ->
    assert.ok  (length < 16), "Num of meta items must be less than 16. size: #{length}"
    # version 4byte + num of meta items 1 byte
    @buf = new Buffer 5
    # version 1
    @buf.writeUInt32LE FORMAT_VERSION, 0
    # num of meta items
    @buf.writeUInt8 (0x80 + length), 4

  # pushLength(length)
  #
  # - size    num of meta items. *optional
  pushLength: (length) ->
    @_pushByte (0x80 + length)

  # pushKeyValue(key, value)
  #
  # - key    key string of meta item
  # - value  value of meta item
  pushKeyValue: (key, value) ->
    @_pushString key
    @_pushValue value

  # pushMetadata(meta)
  #
  # - meta   metadata object
  pushMetadata: (meta) ->
    l = (_.keys meta).length
    @pushLength l
    if l
      for key, value of meta
        @pushKeyValue key, value
    @

  # buffer()
  #
  # - return current buffer of NISI chunk data.
  buffer: ->
    @buf

  # buffer()
  #
  # - return current size of NISI chunk data.
  tell: ->
    @buf.length

  # push(buffer, [start], [end])
  #
  # - buffer buffer object to push
  # - start  nuNumber, optionalm Default:0
  # - start  start offset to slice, optional, Default:0
  # - end    end offset to slice, optional, Default: buffer.length
  # - return this instance
  push: (buf, start, end) ->
    b = buf
    if _.isNumber start
      if _.isNumber end
        b = buf.slice start, end
      else
        b = buf.slice start
    @buf = Buffer.concat [@buf, b]
    @

  _pushByte: (value) ->
    @push new Buffer([value])
    @

  _pushByteArray: (value) ->
    @push new Buffer(value)
    @

  _pushString: (value) ->
    assert.ok _.isString value, "Value must be string. value:#{value}"
    unless value
      @_pushByte 0xa0
      return @
    s = new Buffer value, 'utf8'
    asser.ok (s.length > 256), "String must be less than 256 bytes in UTF-8 coding. value:#{value}"
    if s.length < 32
      @_pushByte (0xa0 + b.length)
      @push s
    else
      @_pushByteArray [0xd9, b.length]
      @push s
    @

  _pushArray: (value) ->
    assert.ok _.isArray value, "Value must be array. value:#{value}"
    for v in value
      if _.isArray v
        @_pushArray v
      else
        @_pushString v
    @

  _pushValue: (value) ->
    if _.isArray v
      @pushArray v
    else
      @pushString v
    @
