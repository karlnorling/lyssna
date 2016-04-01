var _ = require('underscore')
var request = require('request')
var util = require('util')
var S = require('string')

module.exports = function (config) {
  var slackApi = config.slackApi

  /**
   * Get application config from slackConfig
   * @param {Object} snsMessage
   * @return {Object}
   */
  var getApplicationConfig = function (snsMessage) {
    return _.find(config.applications, function (app) {
      return app.applicationName === snsMessage.applicationName
    })
  }

  /**
   * Get the statusData
   * @param {Object} applicationConfig
   * @param {Object} snsMessage
   * @return {Object}
   */
  var getStatusData = function (applicationConfig, status) {
    var applicationTemplate = _.find(applicationConfig.templates, function (template) {
      return template.status === status
    })

    if (!applicationTemplate) {
      console.warn(util.format('SlackLib (postMessage): No application template for status: %s', status))
    }

    return {
      status: applicationTemplate.status,
      template: applicationTemplate.template
    }
  }

  /**
   * Get the hipchat room ids based on config from s3 bucket.
   * @param {Object} snsMessage
   * @return {Array}
   */
  var getChannels = function (snsMessage) {
    var applicationConfig = getApplicationConfig(snsMessage)
    return applicationConfig.channels
  }

  /**
   * Composes the notification message base on sns message data and sns status
   * @param {Object} snsMessage
   * @return {Object}
   */
  var composeMessage = function (snsMessage, revision, metaTags) {
    var applicationConfig = getApplicationConfig(snsMessage)
    var snsStatus = snsMessage.status.toLowerCase()
    var errorInformation = snsMessage.errorInformation || {
      errorMessage: 'Something went wrong with the deploy - missing error message.'
    }
    var deploymentId = snsMessage.deploymentId
    var deploymentGroupName = snsMessage.deploymentGroupName
    var deploymentUri = 'https://console.aws.amazon.com/codedeploy/home?region=us-east-1#/deployments/' + deploymentId
    var deploymentHtml = '<' + deploymentUri + '|' + deploymentId + '>'
    var applicationName = snsMessage.applicationName
    var applicationUri = 'https://console.aws.amazon.com/codedeploy/home?region=us-east-1#/applications/' + applicationName
    var applicationHtml = '<' + applicationUri + '|' + applicationName + '>'
    var statusData = getStatusData(applicationConfig, snsStatus)
    var template = statusData.template
    var msg

    var userMessage = function (metaTags) {
      var userTemplate = getStatusData(applicationConfig, 'user')

      if (metaTags.user && userTemplate) {
        return util.format(userTemplate.template, metaTags.user)
      }
      console.log(util.format('SlackLib (postMessage): No user associated with deployment: %s', deploymentId))
      return
    }

    var combineMessages = function (msg, color, metaTags) {
      var user = userMessage(metaTags)
      if (user) {
        return msg + ' ' + user
      }
      return msg
    }

    if (!template) {
      console.log(util.format('SlackLib (postMessage): No template exists for status: %s', snsStatus))
    }

    switch (snsStatus) {
      case 'created':
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName)
        return combineMessages(msg, 'yellow', metaTags)
      case 'succeeded':
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName)
        return combineMessages(msg, 'green', metaTags)
      case 'failed':
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName, errorInformation.errorMessage)
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
   * Sends a notification to the slack api.
   * @param {Object} snsMessage
   */
  var postMessage = function (snsMessage, metaTags, revision) {
    var cm = composeMessage(snsMessage, revision, metaTags)
    var channels = getChannels(snsMessage)
    var promises = []

    _.each(channels, function (c) {
      var params = {
        channel: c.channel,
        text: cm,
        username: c.username,
        icon_emoji: c.icon_emoji
      }

      promises.push(new Promise(function (resolve, reject) {
        request({
          url: slackApi.webhook,
          method: 'POST',
          json: true,
          body: params
        }, function (err, response, body) {
          console.log('body', body)
          if (err) return reject(err)
          if (!S(response.statusCode).startsWith(20)) {
            console.warn(util.format('SlackLib (postMessage): Slack api returned http status code of: %s, %s', response.statusCode, body))
            reject(response)
          }
          try {
            console.log('SlackLib (postMessage): Slack api reponse', body)
            return resolve(body)
          } catch (e) {
            return reject(e)
          }
        })
      }))
    })

    return promises
  }

  /**
   * Expose API
   */
  return {
    postMessage: postMessage
  }
}
