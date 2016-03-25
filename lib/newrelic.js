/**
See documentation for api call here: https://docs.newrelic.com/docs/apm/new-relic-apm/maintenance/deployment-notifications

Example:
curl -H "x-api-key:REPLACE_WITH_YOUR_API_KEY"
-d "deployment[app_name]=APP_NAME"
-d "deployment[application_id]=APPLICATION_ID"
-d "deployment[description]=DESCRIPTION"
-d "deployment[changelog]=USER"
-d "deployment[user]=USER"
-d "deployment[revision]=REVISION" https://api.newrelic.com/deployments.xml

Paramater limits:
deployment[app_name]: Limited to a single name per request
deployment[application_id]: Limited to a single id per request
deployment[description]: Maximum 65535 characters
deployment[changelog]: Maximum 65535 characters
deployment[user]: Maximum 31 characters
deployment[revision]: Maximum 127 characters
*/

var _ = require('underscore')
var S = require('string')
var request = require('request')
var truncate = require('truncate')
var Promise = require('promise')
var util = require('util')

module.exports = function (config) {
  var paramsData = {
    'description': 65535,
    'changelog': 65535,
    'user': 31,
    'revision': 127
  }

  var newRelicApiUri = config.deploymentsApiUri

  /**
   * Get application config from newrelic config
   * @param {Object} snsMessage
   * @return {Object}
   */
  var getApplicationConfig = function (snsMessage) {
    return _.find(config.applications, function (app) {
      return app.applicationName === snsMessage.applicationName
    })
  }

  /**
   * Truncates param values based on newrelic api limits
   * @param {String} type
   * @param {String} paramValue
   * @return {String}
   */
  var truncateParamValue = function (type, paramValue) {
    var paramLengthLimit = paramsData[type]
    console.log('NewrelicLib: paramValue', paramValue)
    if (paramValue && paramLengthLimit < paramValue.length) {
      console.warn(util.format('NewrelicLib: Newrelic parameter %s with value %s has been truncated.', type, paramValue))
      return truncate(paramValue, paramLengthLimit, {ellipsis: null})
    }
    return paramValue
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

  /**
   * Sends http request to newrelic api to record a deployment
   * @param {Object} sns
   * @param {String} user
   * @param {String} revision
   * @return {Promise}
   */
  var recordDeploymentToNewrelic = function (sns, user, revision) {
    var snsMessage = JSON.parse(sns.Message)
    var applicationConfig = getApplicationConfig(snsMessage)
    var template = getTemplate(applicationConfig, snsMessage.status.toLowerCase())

    if (!applicationConfig) {
      context.fail(util.format('Cannot find app config for: %s', snsMessage.applicationName))
      return
    }

    if (!template) {
      console.log(util.format('NewrelicLib: No template setup for status: "%s", could be ok.', snsMessage.status))
      return
    }

    var params = {
      'deployment[app_name]': snsMessage.applicationName, // Limited to a single name per request
      'deployment[application_id]': applicationConfig.applicationId, // Limited to a single id per request
      'deployment[description]': util.format(template, truncateParamValue('description', sns.Subject)), // Maximum 65535 characters
      'deployment[changelog]': '', // Maximum 65535 characters
      'deployment[user]': truncateParamValue('user', user), // Maximum 31 characters
      'deployment[revision]': truncateParamValue('revision', revision) // Maximum 127 characters
    }

    return new Promise(function (resolve, reject) {
      request({
        url: newRelicApiUri,
        headers: {
          'x-api-key': config.apiKey
        },
        method: 'POST',
        form: params
      }, function (err, response, body) {
        if (err) return reject(err)
        if (!S(response.statusCode).startsWith(20)) {
          console.warn(util.format('NewrelicLib: Newrelic api returned http status code of: %s, %s', response.statusCode, body))
          reject(response)
        }
        try {
          console.log('NewrelicLib: Newrelic api reponse', body)
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
    recordDeploymentToNewrelic: recordDeploymentToNewrelic
  }
}
