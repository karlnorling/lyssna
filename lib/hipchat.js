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
    var applications = _.filter(config.applications, function (app) {
      var re = new RegExp(app.applicationName, 'g')
      var m = re.exec(snsMessage.applicationName)
      return (m && m.length > 0)
    })
    return applications
  }

  /**
   * Get the template based on config from s3 bucket.
   * @param {Object} snsMessage
   * @return {Object}
   */
  var getMessageTemplate = function (snsMessage, applicationConfig) {
    var snsStatus = snsMessage.status.toLowerCase()
    var template = _.find(applicationConfig.templates, function (template) {
      return template.status === snsStatus
    })

    return (template) ? template : _.find(applicationConfig.templates, function (template) {
      return template.status === 'unknown'
    })
  }

  /**
   * Get the user template.
   * @param {Object} snsMessage
   * @return {Object}
   */
  var getUserTemplate = function (applicationConfig) {
    return applicationConfig.templates['user']
  }

  /**
   * Composes the notification message base on sns message data and sns status
   * @param {Object} snsMessage
   * @return {Object}
   */
  var composeMessage = function (snsMessage, revision, userTag, applicationConfig) {
    var snsStatus = snsMessage.status.toLowerCase()
    var deploymentId = snsMessage.deploymentId
    var deploymentGroupName = snsMessage.deploymentGroupName
    var deploymentUri = 'https://console.aws.amazon.com/codedeploy/home?region=us-east-1#/deployments/' + deploymentId
    var deploymentHtml = '<a href=' + deploymentUri + '>' + deploymentId + '</a>'
    var applicationName = snsMessage.applicationName
    var applicationUri = 'https://console.aws.amazon.com/codedeploy/home?region=us-east-1#/applications/' + applicationName
    var applicationHtml = '<a href=' + applicationUri + '>' + applicationName + '</a>'
    var template = getMessageTemplate(snsMessage, applicationConfig).template
    var msg

    var userMessage = function (userTag) {
      var userTemplate = getUserTemplate(applicationConfig)

      if (userTag && userTemplate) {
        return util.format(userTemplate, userTag)
      }
      console.log(util.format('HipchatLib (userMessage): No user associated with deployment: %s', deploymentId))
      return
    }

    var combineMessages = function (msg, color, userTag) {
      var user = userMessage(userTag)
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
        return combineMessages(msg, 'yellow', userTag)
      case 'succeeded':
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName)
        return combineMessages(msg, 'green', userTag)
      case 'failed':
        var errorInformation = JSON.parse(snsMessage.errorInformation)
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName, errorInformation.ErrorCode, errorInformation.ErrorMessage)
        return combineMessages(msg, 'red', userTag)
      case 'stopped':
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName)
        return combineMessages(msg, 'gray', userTag)
      case 'unknown':
      default:
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName, snsStatus)
        return combineMessages(msg, 'random', userTag)
    }
  }

  /**
   * Sends a notification to the hipchat api.
   * @param {Object} snsMessage
   */
  var sendNotification = function (snsMessage, revision, userTag) {
    var applicationConfigs = getApplicationConfig(snsMessage)

    if (!applicationConfigs) {
      console.warn(util.format('HipchatLib (sendNotification): No application config found for applicationName: "%s" in config: "%s"', snsMessage.applicationName, JSON.stringify(config)))
      return
    }

    _.each(applicationConfigs, function (applicationConfig) {
      var cm = composeMessage(snsMessage, revision, userTag, applicationConfig)

      _.each(applicationConfig.rooms, function (room) {
        var params = {
          room: room.id,
          from: room.userName,
          message: cm.message,
          color: cm.color
        }

        hipchatClient.postMessage(params, function (data) {
          console.log(util.format('HipchatLib: (sendNotification) params: %s', JSON.stringify(params)))
          context.succeed(params)
        })
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
