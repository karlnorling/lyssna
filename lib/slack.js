var _ = require('underscore')
var request = require('request')
var util = require('util')
var S = require('string')

module.exports = function (config, context) {
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
  var composeMessage = function (snsMessage, metaTags, revision) {
    var applicationConfig = getApplicationConfig(snsMessage)

    if (!applicationConfig) {
      console.warn(util.format('SlackLib (composeMessage): No application config found for applicationName: "%s" in config: "%s"', snsMessage.applicationName, config))
      return
    }

    var snsStatus = snsMessage.status.toLowerCase()
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

    var userMessage = function (userTag) {
      var userTemplate = getStatusData(applicationConfig, 'user')

      if (userTag && userTemplate) {
        return util.format(userTemplate.template, userTag)
      }
      console.log(util.format('SlackLib (postMessage): No user associated with deployment: %s', deploymentId))
      return
    }

    var combineMessages = function (msg, userTag) {
      var user = userMessage(userTag)
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
        return combineMessages(msg, metaTags)
      case 'succeeded':
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName)
        return combineMessages(msg, metaTags)
      case 'failed':
        var errorInformation = JSON.parse(snsMessage.errorInformation)
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName, errorInformation.ErrorCode, errorInformation.ErrorMessage)
        return combineMessages(msg, metaTags)
      case 'stopped':
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName)
        return combineMessages(msg, metaTags)
      case 'unknown':
      default:
        msg = util.format(template, deploymentHtml, applicationHtml, revision, deploymentGroupName, snsStatus)
        return combineMessages(msg, metaTags)
    }
  }

  var createAttachement = function (snsMessage, cm, c) {
    var
      color,
      snsStatus = snsMessage.status.toLowerCase()

    switch (snsStatus) {
      case 'created':
        color = "#2595db";
      case 'succeeded':
        color = "#36a64f";
      case 'failed':
        color = "#a63636";
      case 'stopped':
        color = "#ef6b13";
      case 'unknown':
      default:
        color = '#'+Math.floor(Math.random()*16777215).toString(16);
    }

    var attachments = {
      "attachments": [{
        "fallback": cm,
        "color": color,
        "title": "Code Deploy Notification",
        "author_name": c.username,
        "author_icon": c.icon_emoji,
        "text": cm,
        "fields": [
          {
            "title": "applicationName",
            "value": snsMessage.applicationName,
            "short": true
          }, {
            "title": "status",
            "value": snsStatus,
            "short": true
          }, {
            "title": "deploymentGroupName",
            "value": snsMessage.deploymentGroupName,
            "short": true
          }, {
            "title": "deploymentId",
            "value": snsMessage.deploymentId,
            "short": true
          }, {
            "title": "region",
            "value": snsMessage.region,
            "short": true
          }]
        }]
    };
    return attachments;
  };

  /**
   * Sends a notification to the slack api.
   * @param {Object} snsMessage
   */
  var postMessage = function (snsMessage, userTag, revision) {
    var cm = composeMessage(snsMessage, userTag, revision)
    var channels = getChannels(snsMessage)
    var promises = []

    _.each(channels, function (c) {

      var attachments = createAttachement(snsMessage, cm, c);
      promises.push(new Promise(function (resolve, reject) {
        request({
          url: slackApi.webhook,
          method: 'POST',
          json: true,
          body: attachments
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
