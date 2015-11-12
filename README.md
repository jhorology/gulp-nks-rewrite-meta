## gulp-nks-rewrite-meta

Gulp plugin for rewriting metadata of NKS(Native Kontrol Standard) preset file.

## Installation
```
  npm install gulp-nks-rewrite-meta --save-dev
```

## Usage

using the static data.
```coffeescript
rewrite = require 'gulp-nks-rewrite-meta'

gulp.task 'dist', ->
  gulp.src ["src/Piano/**/*.nksf"]
    .pipe rewrite
      modes: ['Sample-based']
      types: [
        ["Piano/Keys"]
        ["Piano/Keys", "Electric Piano"]
      ]
    .pipe gulp.dest "dist"
```

using the function to provide data.
```coffeescript
rewrite = require 'gulp-nks-rewrite-meta'

gulp.task 'dist', ->
  gulp.src ["src/Velvet/**/*.nksf"], read: true
    .pipe rewrite (file, metadata) ->
      folder = path.relative 'src/Velvet', path.dirname file.path
      # using folder as preset bank
      bankchain: ['Velvet', folder, '']
    .pipe gulp.dest "dist"
```

using the non-blocking function to provide data.
```coffeescript
rewrite = require 'gulp-nks-rewrite-meta'

gulp.task 'dist', ->
  gulp.src ["src/**/*.nksf"], read: true
  .pipe rewrite (file, metadata, done) ->
    # create data in non-blocking
    nonblockingfunction metadata, (err, data) ->
      done err, data
  .pipe gulp.dest 'dist'
```

## API

### rewrite(data)

#### data
Type: `Object` or `function(file, metadata)`

The data or data provider to rewrite for.

##### data.author [optional]
Type: `String`

##### data.bankchain [optional]
Type: `Array` of `String`

The length of array should be 3.

##### data.comment [optional]
Type: `String`

##### data.modes [optional]
Type: `Array` of `String`

The length of array should be less than 16.

##### data.name [optional]
Type: `String`

##### data.types [optional]
Type: 2 dimensional `Array` of `String`

The maximum index of array is (15, 2).

examle:
  [
    ["Piano/Keys"],
    ["Piano/Keys", "Electric Piano"]
  ]

#### function (file, metadata [,callbak])
The functoin to provide data.

##### file
Type: instance of `vinyl` file

##### metadata
Type: `Object`

The metadata of source file.

##### callback
Type: `function(err, data)`

The callback function to support non-blocking data provider.

example metadata of .nksf
```javascript
{
  "UUID": "7E256217-47DA-4746-0001-A4656EF12290",
  "author": "C.Pitman",
  "bankchain": ["Mini V2", "", ""],
  "comment": "",
  "deviceType": "INST",
  "modes": ["Long Release", "Synthetic"],
  "name": "poly5",
  "types": [
    ["Synth Pad", "Basic Pad"],
    ["Synth Pad", "Bright Pad"]
  ],
  "uuid": "",
  "vendor": "Arturia"
}
```

```javascript
{
  "author": "",
  "bankchain": ["Velvet", "MKII", ""],
  "comment": "",
  "deviceType": "INST",
  "modes": ["Sample-based"],
  "name": "69 MKII Spooky Ring Mod",
  "types": [
    ["Piano/Keys"],
    ["Piano/Keys", "Electric Piano"]
  ],
  "uuid": "b9d0a3da-3603-45b9-b5e9-99207f131991",
  "vendor": "AIR Music Technology"
}
```
