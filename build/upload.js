var AWS = require('aws-sdk')
var s3 = new AWS.S3({apiVersion: '2006-03-01', region: 'us-east-1'})
var config = require('./config.json')
var packageConfig = require('./../package.json')
var Promise = require('promise')
var version = packageConfig.version
var util = require('util')
var _ = require('underscore')
var fs = require('fs')

function uploadLyssna (config) {
  var lambdaConfig = config.lambda
  var fileName = '/lyssna-' + version + '.zip'
  var params = {
    Bucket: lambdaConfig.s3.bucket,
    Key: lambdaConfig.s3.key + fileName
  }
  var readStream = fs.createReadStream('.' + fileName)
  var uploadParams = _.extend({ Body: readStream }, params)

  handleFileCheckResult(fileCheck(params), uploadParams)
}

function uploadConfigs (config) {
  var s3Config = config.configs

  _.each(s3Config.files, function (file) {
    var params = {
      Bucket: s3Config.s3.bucket,
      Key: s3Config.s3.key + file.name + '-' + version + '.json'
    }
    var readStream = fs.createReadStream(file.local_path)
    var uploadParams = _.extend({ Body: readStream }, params)

    handleFileCheckResult(fileCheck(params), uploadParams)
  })
}

function fileUpload (params) {
  var request = s3.putObject(params, function (err) {
    if (err) {
      console.error(err, err.stack)
    }
  })

  return new Promise(function (resolve, reject) {
    request.send(function (err, data) {
      if (err) return reject(err)
      try {
        return resolve(data)
      } catch (e) {
        return reject(e)
      }
    })
  })
}

function doFileUpload (params) {
  process.stdout.write(util.format('\nStarting upload of %s: ', params.Key))
  drawProgress(true)
  fileUpload(params).then(function (data) {
    drawProgress(false)
    process.stdout.write(util.format('\nUpload of %s finished with success.', params.Key))
  }).catch(function (err) {
    drawProgress(false)
    process.stdout.write(util.format('\nUpload of %s failed.', params.Key))
    console.log(err)
  })
}

function handleFileCheckResult (promise, params) {
  promise.then(function (data) {
    process.stdout.write(util.format('\n%s was found, will override the file.', params.Key))
    doFileUpload(params)
  }).catch(function (data) {
    if (data.statusCode === 404) {
      process.stdout.write(util.format('\n%s wasn\'t found, proceeding to upload file.', params.Key))
      doFileUpload(params)
    } else {
      console.error(data)
    }
  })
}

function fileCheck (params) {
  var request = s3.headObject(params, function (err) {
    if (err) {
      if (err.statusCode !== 404) {
        console.error(err, err.stack)
      }
    }
  })

  return new Promise(function (resolve, reject) {
    request.send(function (err, data) {
      if (err) return reject(err)
      try {
        return resolve(data)
      } catch (e) {
        return reject(e)
      }
    })
  })
}

function drawProgress (dot) {
  setTimeout(function () {
    process.stdout.write('.')
    if (dot) {
      drawProgress()
    }
  }, 200)
}

uploadConfigs(config)
uploadLyssna(config)