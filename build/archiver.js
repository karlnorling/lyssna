var archiver = require('archiver')
var archive  = archiver('zip')
var config = require('./config.json')
var fs = require('fs')

var version = config.lambda.version
var output = fs.createWriteStream('./lyssna-' + version +'.zip')
var fileNames = config.archive.files
var basePath =  './'

archive.pipe(output)

archive.on('end', function (data) {
  console.log('Created: ' + this._readableState.pipes.path)
})

var getStream = function (fileName) {
  return fs.readFileSync(fileName)
}

for( i=0; i < fileNames.length; i++) {
  var fileName = fileNames[i]
  var path = basePath + fileName

  console.log('Zipping: ' + path)

  if (fs.statSync(path).isDirectory()) {
    archive.directory(path, path, { name: fileName })
  } else {
    archive.append(getStream(path), { name: fileName })
  }
}

archive.finalize(function(err, bytes) {
  if (err) {
    throw err
  }
})