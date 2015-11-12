
assert       = require 'assert'
through      = require 'through2'
gutil        = require 'gulp-util'
_            = require 'underscore'
reader       = require 'riff-reader'
nksJson      = require 'nks-json'
riffBuilder  = require './riff-builder'

PLUGIN_NAME = 'bitwig-rewrite-meta'
# chunk id
$ =
 chunkId: 'NISI'
 formType: 'NIKS'
 metaItems: [
  'author'
  'bankchain'
  'comment'
  'modes'      # optional, default: not contained.
  'name'
  'types'      # optional. default: not contained.
 ]

module.exports = (data) ->
  through.obj (file, enc, cb) ->
    rewrited = off
    rewrite = (err, obj) =>
      if rewrited
        @emit 'error', new gutil.PluginError PLUGIN_NAME, 'duplicate callback'
        return
      rewrited = on
      if err
        @emit 'error', new gutil.PluginError PLUGIN_NAME, err
        return cb()
      try
        chunk =  _createChunk file, obj
        _replaceChunk file, chunk
        @push file
      catch error
        @emit 'error', new gutil.PluginError PLUGIN_NAME, error
      cb()

    unless file
      rewrite 'Files can not be empty'
      return

    if file.isStream()
      rewrite 'Streaming not supported'
      return
      
    if _.isFunction data
      try
        metadata = _deserializeChunk file
        obj = data.call @, file, metadata, rewrite
      catch error
        rewrite error
      if data.length <= 2
        rewrite undefined, obj
    else
      try
        data = _validate data
        _deserializeChunk file
      catch error
        return error
      rewrite undefined, data

#
# deserialize NISI chunk
_deserializeChunk = (file) ->
  src = if file.isBuffer() then file.contents else file.path
  json = undefined
  reader(src, $.formType).readSync (id, data) ->
    assert.ok (id is $.chunkId), "Unexpected chunk id. id:#{id}"
    assert.ok (_.isUndefined json), "Duplicate metadata chunk."
    json = nksJson.deserializer data
      .deserialize()
  , [$.chunkId]

  assert.ok json, "#{$.chunkId} chunk is not contained in file."
  # set original metadata
  file.data = json
  json

#
# create new NISI chunk
_createChunk = (file, obj) ->
  originalKeys = _.keys file.data
  rewriteKeys  = _.keys obj

  # optionnal items
  shouldInsertModes = not ('modes' in originalKeys) and 'modes' in rewriteKeys
  shouldInsertTypes = not ('types' in originalKeys) and 'types' in rewriteKeys

  # create new NISI chunk
  meta = {}
  for key, value of file.data
    # insert 'modes' pre 'name'
    if shouldInsertModes and key is 'name'
      chunk.pushKeyValue 'modes', obj.modes
      meta.modes = obj.modes

    # replace metadata
    if key in rewriteKeys
      meta[key] = obj[key]
    else
      meta[key] = value

    # insert 'types' post 'name'
    if shouldInsertTypes and key is 'name'
      chunk.pushKeyValue 'types', obj.types
      meta.types = obj.types

  # set metadata to output file
  file.data = meta
  
  # seriaize metadata to buffer
  nksJson.serializer meta
    .serialize()
    .buffer()

#
# replace NISI chunk
_replaceChunk = (file, chunk) ->
  # riff buffer builder
  riff = riffBuilder $.formType

  # iterate chunks
  src = if file.isBuffer() then file.contents else file.path
  reader(src, $.formType).readSync (id, data) ->
    if id is $.chunkId
      riff.pushChunk id, chunk
    else
      riff.pushChunk id, data

  # output file
  file.contents = riff.buffer()

# validate object
_validate = (obj) ->
  obj = obj or {}
  for key, value of obj
    switch key
      when 'author','comment', 'name'
        _assertString key, value
      when 'bankchain'
        _assertArray key, value, on, 3
      when 'modes'
        _assertArray key, value, off, 16
      when 'types'
        _assertTypes key, value
      else
        assert.ok false, "Unsupported option #{key}."
  obj

# assert string property
_assertString = (key, value) ->
  assert.ok (_.isString value), "Option #{key} must be string. #{key}:#{value}"

# assert array property
_assertArray = (key, value, equal, size) ->
  assert.ok (_.isArray value), "Option #{key} must be array or string. #{key}:#{value}"
  if equal
    assert.ok (value.length is size), "Option #{key} array length must be #{size}. #{key}:#{value}"
  else
    assert.ok (value.length < size), "Option #{key} array length must be less than #{size}. #{key}:#{value}"
  for s in value
    assert.ok (_.isString s), "Option #{key} must be array of string. #{key}:#{value}"

# assert 'types' property
_assertTypes = (key, value) ->
  assert.ok (_.isArray value), "Option #{key} must be 2 dimensional array or string. #{key}:#{value}"
  assert.ok (value.length < 16), "Option #{key} array length must be less than (16,3). #{key}:#{value}"
  for ar in value
    assert.ok (_.isArray ar), "Option #{key} must be 2 dimensional array of string. #{key}:#{value}"
    assert.ok (ar.length < 3), "Option #{key} array length must be less than (16,3). #{key}:#{value}"
    for s in ar
      assert.ok (_.isString s), "Option #{key} must be 2 dimensional array of string. #{key}:#{value}"

