assert       = require 'assert'
through      = require 'through2'
gutil        = require 'gulp-util'
_            = require 'underscore'
reader       = require './riff-reader'
builder      = require './riff-builder'
chunkParser  = require './nisi-chunk-parser'
chunkBuilder = require './nisi-chunk-builder'

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
        _rewriteMeta file, obj
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
        obj = data.call @, file, (_parseMeta file), rewrite
      catch error
        rewrite error
      if data.length <= 2
        rewrite undefined, obj
    else
      rewrite undefined, data


_parseMeta = (file) ->
  src = if file.isBuffer() then file.contents else file.path
  ret = undefined
  reader(src, $.formType).read (id, data) ->
    assert.ok (id is $.chunkId), "Unexpected chunk id. id:#{id}"
    assert.ok (_.isUndefined ret), "Duplicate metadata chunk."
    ret = chunkParser(data).parse()
  , [$.chunkId]

  assert.ok ret, "#{$.chunkId} chunk is not contained in file."
  # set original metadata
  file.data = ret
  ret

_rewriteMeta = (file, obj) ->
  obj = _validate obj
  src = if file.isBuffer() then file.contents else file.path
  originalKeys = _.keys file.data
  rewriteKeys  = _.keys obj
  
  # optionnal items
  shouldInsertModes = not ('modes' in originalKeys) and 'modes' in rewriteKeys
  shouldInsertTypes = not ('types' in originalKeys) and 'types' in rewriteKeys
  
  # meta chunk length
  chunkLength = originalKeys.length
  chunkLength += 1 if shouldInsertModes
  chunkLength += 1 if shouldInsertTypes
  
  bldr = builder $.formType
  meta = {}
  reader(src, $.formType).read (id, data) ->
    if id is $.chunkId
      chunk = chunkBuilder chunkLength
      chunkParser(data).parse (key, value, buf) ->
        # insert 'modes' pre 'name'
        if shuldInsertModes and key is 'name'
          chunk.pushKeyValue 'modes', obj.modes
          meta.modes = obj.modes
          
        if key in rewriteKeys
          chunk.pushKeyValue key, obj[key]
          meta[key] = obj[key]
        else
          chunk.push buf
          meta[key] = value

        # insert 'types' post 'name'
        if shuldInsertTypes and key is 'name'
          chunk.pushKeyValue 'types', obj.types
          meta.types = obj.types

      bldr.pushChunk id, chunk.buffer()
    else
      bldr.pushChunk id, data
  file.contents = bldr.buffer()
  file.data = meta

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

