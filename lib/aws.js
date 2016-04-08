var AWS = require('aws-sdk')
var s3 = new AWS.S3({apiVersion: '2006-03-01', region: 'us-east-1'})
var Promise = require('promise')
var codedeploy = new AWS.CodeDeploy({apiVersion: '2014-10-06', region: 'us-east-1'})

module.exports = function (context) {
  /**
   * Gets deployment information
   * @param {String} deploymentId - The deployment id of the codedeploy deployment
   * @return {Promise}
   */
  var getDeploymentDetails = function (deploymentId) {
    var params = {
      deploymentId: deploymentId
    }

    var request = codedeploy.getDeployment(params, function (err, data) {
      if (err) {
        console.error('AWSLib (getDeploymentDetails): ' + err, err.stack)
        context.fail('AWSLib (getDeploymentDetails): ' + err)
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

  /**
   * Gets meta tags on a s3 object
   * @param {json} config - The json object of a app.json notification type.
   * @return {Promise}
   */
  var getMetaTags = function (config) {
    var params = {
      Bucket: config.bucket,
      Key: config.key
    }

    var request = s3.headObject(params, function (err, data) {
      if (err) {
        console.error('AWSLib (getMetaTags): ' + err, err.stack)
        context.fail('AWSLib (getMetaTags): ' + err)
      }
    })

    return new Promise(function (resolve, reject) {
      request.send(function (err, data) {
        if (err) return reject(err)

        try {
          return resolve(data.Metadata)
        } catch (e) {
          return reject(e)
        }
      })
    })
  }

  /**
   * Gets notification config from s3
   * @param {json} config - The json object of a app.json notification type.
   * @return {Promise}
   */
  var getNotificationConfig = function (config) {
    var params = {
      Bucket: config.bucket,
      Key: config.key
    }

    var request = s3.getObject(params, function (err, data) {
      if (err) {
        console.error('AWSLib (getNotificationConfig): bucket=' + config.bucket + ', key=' + config.key, err.stack)
        context.fail('AWSLib (getNotificationConfig): bucket=' + config.bucket + ', key=' + config.key)
      }
    })

    return new Promise(function (resolve, reject) {
      request.send(function (err, data) {
        if (err) return reject(err)

        try {
          return resolve(JSON.parse(data.Body.toString()))
        } catch (e) {
          return reject(e)
        }
      })
    })
  }

  /**
  * Expose API
  */
  return {
    getDeploymentDetails: getDeploymentDetails,
    getMetaTags: getMetaTags,
    getNotificationConfig: getNotificationConfig
  }
}
