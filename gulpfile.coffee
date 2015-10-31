gulp        = require 'gulp'
coffeelint  = require 'gulp-coffeelint'
coffee      = require 'gulp-coffee'
del         = require 'del'
watch       = require 'gulp-watch'
beautify    = require 'js-beautify'

# paths, misc settings
$ =
  sparkPresetsDir: '/Library/Arturia/Spark/Third Party/Native Instruments/presets'
  miniVPresetsDir: '/Library/Arturia/Mini V2/Third Party/Native Instruments/presets'
  
gulp.task 'coffeelint', ->
  gulp.src ['./*.coffee', './src/*.coffee']
    .pipe coffeelint './coffeelint.json'
    .pipe coffeelint.reporter()

gulp.task 'coffee', ['coffeelint'], ->
  gulp.src ['./src/*.coffee']
    .pipe coffee()
    .pipe gulp.dest './lib'

gulp.task 'default', ['coffee']

gulp.task 'watch', ->
  gulp.watch './**/*.coffee', ['default']
 
gulp.task 'clean', (cb) ->
  del ['./lib/*.js', './**/*~'], force: true, cb


# parse spark presets
gulp.task 'parse-spark-presets', ['default'], ->
  rewrite = require './index'
  gulp.src ["#{$.sparkPresetsDir}/**/*.nksf"]
    .pipe rewrite (file, data) ->
      console.info beautify (JSON.stringify data), indent_size: 2
      undefined

# parse mini V presets
gulp.task 'parse-miniv-presets', ['default'], ->
  rewrite = require './index'
  gulp.src ["#{$.miniVPresetsDir}/**/*.nksf"]
    .pipe rewrite (file, data) ->
      console.info beautify (JSON.stringify data), indent_size: 2
      undefined
