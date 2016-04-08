/**
Out of date npm module for pager duty exists here:
https://github.com/skomski/node-pagerduty

Only need the create endpoint, will implement it standalone.
*/

var _ = require('underscore')
var request = require('request')
var S = require('string')
var Promise = require('promise')
var util = require('util')

module.exports = function (config, context) {
  var pagerDutyApiUri = config.pagerDutyApiUri

  /**
   * Get application config from pagerduty config
   * @param {Object} snsMessage
   * @return {Object}
   */
  var getApplicationConfig = function (snsMessage) {
    return _.find(config.applications, function (app) {
      return app.applicationName === snsMessage.applicationName
    })
  }

  /**
   * Gets the description template from config
   * @param {Object} applicationConfig
   * @param {String} snsStatus
   * @return {String}
   */
  var getTemplate = function (applicationConfig, snsStatus) {
    return applicationConfig.templates[snsStatus]
  }

  var triggerPagerDutyAlert = function (sns, user, revison) {
    var snsMessage = JSON.parse(sns.Message)
    var applicationConfig = getApplicationConfig(snsMessage)
    var snsStatus = snsMessage.status.toLowerCase()
    var template = getTemplate(applicationConfig, snsStatus)

    if (!template) {
      console.warn(util.format('PagerDutyLib (triggerPagerDutyAlert): No template for sns status "%s"', snsStatus))
      return
    }

    var deploymentUri = 'https://console.aws.amazon.com/codedeploy/home?region=us-east-1#/deployments/' + snsMessage.deploymentId

    var applicationUri = 'https://console.aws.amazon.com/codedeploy/home?region=us-east-1#/applications/' + snsMessage.applicationName

    applicationConfig.options.description = sns.Subject
    applicationConfig.options.incident_key = sns.MessageId
    applicationConfig.options.client = snsMessage.applicationName
    applicationConfig.options.client_url = deploymentUri
    applicationConfig.options.details = snsMessage
    applicationConfig.options.contexts = [
      {
        'type': 'link',
        'href': applicationUri,
        'text': 'AWS Application'
      },
      {
        'type': 'link',
        'href': deploymentUri,
        'text': 'AWS Deploy'
      }
    ]

    return new Promise(function (resolve, reject) {
      request({
        url: pagerDutyApiUri,
        headers: {
          Authorization: 'Token token: ' + config.apiKey,
          'content-type': 'application/json'
        },
        json: true,
        method: 'POST',
        body: applicationConfig.options
      }, function (err, response, body) {
        if (err) return reject(err)
        if (!S(response.statusCode).startsWith(20)) {
          console.warn(util.format('PagerDutyLib (triggerPagerDutyAlert): Newrelic api returned http status code of: %s, %s', response.statusCode, body))
          reject(response)
        }
        try {
          console.log('PagerDutyLib: pager duty api reponse', body)
          return resolve(body)
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
    triggerPagerDutyAlert: triggerPagerDutyAlert
  }
}
