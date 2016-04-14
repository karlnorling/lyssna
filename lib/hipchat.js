var _ = require('underscore')
var Hipchat = require('node-hipchat')
var util = require('util')

module.exports = function (config, context) {
  var hipchatClient = new Hipchat(config.apiKey)

  /**
   * Get application config from app config
   * @param {Object} snsMessage
   * @return {Object}
   */
  var getApplicationConfig = function (snsMessage) {
    return _.find(config.applications, function (app) {
      return app.applicationName === snsMessage.applicationName
    })
  }

  /**
   * Get the template based on config from s3 bucket.
   * @param {Object} snsMessage
   * @return {Object}
   */
  var getMessageTemplate = function (snsMessage) {
    var applicationConfig = getApplicationConfig(snsMessage)
    var snsStatus = snsMessage.status.toLowerCase()

    if (!applicationConfig) {
      context.fail(format.util('No application config found for: %s inf applicationConfig: %s', snsMessage.applicationName, config))
      return
    }

    return (applicationConfig.templates[snsStatus]) ? applicationConfig.templates[snsStatus] : applicationConfig.templates['unknown']
  }

  /**
   * Get the user template.
   * @param {Object} snsMessage
   * @return {Object}
   */
  var getUserTemplate = function (snsMessage) {
    var applicationConfig = getApplicationConfig(snsMessage)
    return applicationConfig.templates['user']
  }

  /**
   * Get the hipchat room ids based on config from s3 bucket.
   * @param {Object} snsMessage
   * @return {Array}
   */
  var getRooms = function (snsMessage) {
    var applicationConfig = getApplicationConfig(snsMessage)
    return applicationConfig.rooms
  }

  /**
   * Composes the notification message base on sns message data and sns status
   * @param {Object} snsMessage
   * @return {Object}
   */
  var composeMessage = function (snsMessage, revision, metaTags) {
    var snsStatus = snsMessage.status.toLowerCase()
    var deploymentId = snsMessage.deploymentId
    var deploymentGroupName = snsMessage.deploymentGroupName
    var deploymentUri = 'https://console.aws.amazon.com/codedeploy/home?region=us-east-1#/deployments/' + deploymentId
    var deploymentHtml = '<a href=' + deploymentUri + '>' + deploymentId + '</a>'
    var applicationName = snsMessage.applicationName
    var applicationUri = 'https://console.aws.amazon.com/codedeploy/home?region=us-east-1#/applications/' + applicationName
    var applicationHtml = '<a href=' + applicationUri + '>' + applicationName + '</a>'
    var template = getMessageTemplate(snsMessage)
    var msg

    var userMessage = function (metaTags) {
      var userTemplate = getUserTemplate(snsMessage)

      if (metaTags.user && userTemplate) {
        return util.format(userTemplate, metaTags.user)
      }
      console.log(util.format('HipchatLib (userMessage): No user associated with deployment: %s', deploymentId))
      return
    }

    var combineMessages = function (msg, color, metaTags) {
      var user = userMessage(metaTags)
      if (user) {
        return {
          message: msg + ' ' + user,
          color: color
        }
      }
      return {
        message: msg,
        color: color
      }
    }

    if (!template) {
      console.log(util.format('HipchatLib (combineMessages): No template exists for status: %s', snsStatus))
    }

    switch (snsStatus) {
      case 'created':
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName)
        return combineMessages(msg, 'yellow', metaTags)
      case 'succeeded':
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName)
        return combineMessages(msg, 'green', metaTags)
      case 'failed':
        var errorInformation = JSON.parse(snsMessage.errorInformation)
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName, errorInformation.ErrorCode, errorInformation.ErrorMessage)
        return combineMessages(msg, 'red', metaTags)
      case 'stopped':
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName)
        return combineMessages(msg, 'gray', metaTags)
      case 'unknown':
      default:
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName, snsStatus)
        return combineMessages(msg, 'random', metaTags)
    }
  }

  /**
   * Sends a notification to the hipchat api.
   * @param {Object} snsMessage
   */
  var sendNotification = function (snsMessage, revision, metaTags) {
    var cm = composeMessage(snsMessage, revision, metaTags)
    var rooms = getRooms(snsMessage)

    _.each(rooms, function (room) {
      var params = {
        room: room.id,
        from: room.userName,
        message: cm.message,
        color: cm.color
      }

      hipchatClient.postMessage(params, function (data) {
        console.log(util.format('HipchatLib: (sendNotification) %s', params))
        context.succeed(params)
      })
    })
  }

  /**
   * Expose API
   */
  return {
    sendNotification: sendNotification
  }
}
