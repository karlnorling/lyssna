var AWS = require('aws-sdk')
var s3 = new AWS.S3({apiVersion: '2006-03-01', region: 'us-east-1'})
var config = require('./config.json')
var packageConfig = require('./../package.json')
var Promise = require('promise')
var version = packageConfig.version
var util = require('util')
var _ = require('underscore')

function uploadLyssna (config) {
  var lambdaConfig = config.lambda
  var params = {
    Bucket: lambdaConfig.s3.bucket,
    Key: lambdaConfig.s3.key + '/lyssna-' + version + '.zip'
  }
  handleFileCheckResult(fileCheck(params), params)
}

function uploadConfigs (config) {
  var s3Config = config.configs

  _.each(s3Config.files, function (file) {
    var params = {
      Bucket: s3Config.s3.bucket,
      Key: s3Config.s3.key + file.name + '-' + version + '.json',
      Body: require(file.local_path)
    }
    handleFileCheckResult(fileCheck(params), params)
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
  fileUpload(params).then(function (data) {
    console.log(util.format('Upload of %s succeeded.', params.Key))
  }).catch(function (err) {
    console.log(util.format('Upload of %s failed.', params.Key))
    console.log(err)
  })
}

function handleFileCheckResult (promise, params) {
  promise.then(function (data) {
    console.log(util.format('%s was found, will override the file.', params.Key))
    doFileUpload(params)
  }).catch(function (data) {
    if (data.statusCode === 404) {
      console.log(util.format('%s wasn\'t found, proceeding to upload file.', params.Key))
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

uploadConfigs(config)
uploadLyssna(config)