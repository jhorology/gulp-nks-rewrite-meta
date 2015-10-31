assert = require 'assert'
_      = require 'underscore'

# NISI chunk format version
FORMAT_VERSION = 1

# function(data)
#
# - data   data buffer of NISI chunk content.
# - return instance of parser
module.exports = (data) ->
  new NISIChunkParser data

class NISIChunkParser
  # new NISIChunkParser(data)
  #
  # - data   data buffer of NISI chunk content.
  constructor: (data) ->
    # chunk id 4byte + size 4byte
    @buf = data
    @pos = 0
    @marker = 0

  # parse([callback])
  #
  # - callback function(key, value, buffer)  *optional
  #   - key    key of meta item
  #   - value  value of meta item
  #   - buffer key/value pair buffer
  # - return   metadata object
  parse: (callback) ->
    version = @_readUInt32LE()
    assert.ok (version is FORMAT_VERSION), "Unknown NISI format version. version:#{version}"
    type = @_readByte()
    assert.ok ((type & 0xf0) is 0x80), "NISI chunk must start with 0x8x. value:#{_toHexByte type}"
    ret = {}
    for i in [0...(type & 0x0f)]
      @mark()
      key = @_readKey()
      value = @_readValue()
      if _.isFunction callback
        callback.call @, key, value, @mark()
      ret[key] = value
    ret

  mark: ->
    ret = @buf.slice @marker, @pos
    @marker = @pos
    ret

  _readKey: ->
    @_readString @_readByte()

  _readValue: ->
    type = @_readByte()
    if (type & 0xf0) is 0x90
      @_readValue() for i in [0...(type & 0x0f)]
    else
      @_readString type

  _readByte: ->
    ret = @buf[@pos]
    @pos += 1
    ret

  _readUInt32LE: ->
    ret = @buf.readUInt32LE @pos
    @pos += 4
    ret

  _readUInt16BE: ->
    ret = @buf.readUInt16BE @pos
    @pos += 2
    ret

  _readString: (type) ->
    length = undefined
    switch type >>> 4
      when 0x0a # string <16 bytes
        length = type & 0x0f
      when 0x0b # string <32 bytes
        length = type & 0x1f
      when 0x0d # string >=32 bytes
        switch type
          when 0xd9 #string < 256
            length = @_readByte()
          when 0xda #string >= 256
            length = @_readUInt16BE()
    assert.ok (_.isNumber length), "Unsupported value type. type:#{_toHexByte type}"
    return '' unless length

    ret = @buf.toString 'utf8', @pos, (@pos + length)
    @pos += length
    ret

# utils
# -------------------

#  convert byte to hex string
_toHexByte = (value) ->
  "0x" + "0#{value.toString 16}"[-2..]
