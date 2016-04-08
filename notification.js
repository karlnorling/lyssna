console.log('Loading event')

var _ = require('underscore')
var util = require('util')
var AwsLib = require('./lib/aws.js')
var awsHelper = new AwsLib()
var HipchatLib = require('./lib/hipchat.js')
var NewrelicLib = require('./lib/newrelic.js')
var PagerdutyLib = require('./lib/pagerduty.js')
var SlackLib = require('./lib/slack.js')
var appConfig = require('./config/app.json')
var Promise = require('promise')

exports.handler = function (event, context) {
  var getRevisionData = function (snsMessage) {
    var deploymentId = snsMessage.deploymentId
    var awsRequest = awsHelper.getDeploymentDetails(deploymentId)

    return awsRequest.then(function (deployment) {
      return deployment.deploymentInfo.revision
    }).catch(function (err) {
      context.fail(util.format('S3 Bucket error: "%s"', err))
    })
  }

  var getRevisionNumber = function (revision, deploymentId) {
    switch (revision.revisionType) {
      case 'S3':
        return parseS3Key(revision.s3Location)
      case 'GitHub':
        return revision.gitHubLocation.commitId
      default:
        console.warn(util.format('No matching revisionType "%s" for deploymentId "%s"', revision.revisionType, deploymentId))
        return
    }
  }

  var getMetaTagsForS3Key = function (revision, deploymentId) {
    switch (revision.revisionType) {
      case 'S3':
        return awsHelper.getMetaTags(revision.s3Location)
      case 'GitHub':
        console.warn(util.format('Need to implement github api to get commit information for SHA.'))
        return new Promise()
      default:
        console.warn(util.format('No matching revisionType "%s" for deploymentId "%s"', revision.revisionType, deploymentId))
        return
    }
  }

  var parseS3Key = function (s3Location) {
    var re = /(\d+\.)?(\d+\.)?(\*|\d+)/
    var str = s3Location.key
    var m
    var revision

    if ((m = re.exec(str)) !== null) {
      if (m.index === re.lastIndex) {
        re.lastIndex++
      }
      revision = revision = m[0]
      return revision
    }
    console.warn(util.format('No revision found for s3Location: "%s"', s3Location.key))
    return
  }

  _.each(event.Records, function (record) {
    if (!record) {
      context.fail(util.format('No records in event: %s', event.type))
      return
    }
    var sns = record.Sns
    var snsMessage = JSON.parse(sns.Message)
    var trigger = appConfig.snsEventTriggers[snsMessage.eventTriggerName]
    var deploymentId = snsMessage.deploymentId

    if (!trigger) {
      context.fail(util.format('Unsupported sns event trigger name: %s', snsMessage.eventTriggerName))
      return
    }

    var revisionPromise = getRevisionData(snsMessage)

    _.each(trigger, function (channel, key) {
      switch (key) {
        case 'hipchat':
          var hipchatConfigPromise = awsHelper.getNotificationConfig(channel.s3)

          Promise.all([hipchatConfigPromise, revisionPromise]).then(function (values) {
            var hipchatApi = new HipchatLib(values[0], context)
            var revision = getRevisionNumber(values[1], deploymentId)
            var metaTagsPromise = getMetaTagsForS3Key(values[1], deploymentId)

            metaTagsPromise.then(function (metaTags) {
              // Function call below can be a callback.
              hipchatApi.sendNotification(snsMessage, revision, metaTags)
            }).catch(function (err) {
              context.fail(util.format('Error: "%s"', err))
            })
          }).catch(function (err) {
            context.fail(util.format('Error: "%s"', err))
          })
          break
        case 'newrelic':
          var newrelicConfigPromise = awsHelper.getNotificationConfig(channel.s3)

          Promise.all([newrelicConfigPromise, revisionPromise]).then(function (values) {
            var newrelicApi = new NewrelicLib(values[0], context)
            var revision = getRevisionNumber(values[1], deploymentId)
            var metaTagsPromise = getMetaTagsForS3Key(values[1], deploymentId)

            metaTagsPromise.then(function (metaTags) {
              // Function call below can be a callback.
              newrelicApi.recordDeploymentToNewrelic(sns, metaTags.user || '', revision)
            }).catch(function (err) {
              context.fail(util.format('Error: "%s"', err))
            })
          }).catch(function (err) {
            context.fail(util.format('Error: "%s"', err))
          })
          break
        case 'pagerduty':
          var pagerdutyConfigPromise = awsHelper.getNotificationConfig(channel.s3)

          Promise.all([pagerdutyConfigPromise, revisionPromise]).then(function (values) {
            var pagerdutyLib = new PagerdutyLib(values[0], context)
            var revision = getRevisionNumber(values[1], deploymentId)
            var metaTagsPromise = getMetaTagsForS3Key(values[1], deploymentId)

            metaTagsPromise.then(function (metaTags) {
              // Function call below can be a callback.
              pagerdutyLib.triggerPagerDutyAlert(sns, metaTags.user || '', revision)
            }).catch(function (err) {
              context.fail(util.format('Error: "%s"', err))
            })
          }).catch(function (err) {
            context.fail(util.format('Error: "%s"', err))
          })
          break
        case 'slack':
          var slackConfigPromise = awsHelper.getNotificationConfig(channel.s3)

          Promise.all([slackConfigPromise, revisionPromise]).then(function (values) {
            var slackLib = new SlackLib(values[0], context)
            var revision = getRevisionNumber(values[1], deploymentId)
            var metaTagsPromise = getMetaTagsForS3Key(values[1], deploymentId)

            metaTagsPromise.then(function (metaTags) {
              // Function call below can be a callback.
              slackLib.postMessage(snsMessage, metaTags.user || '', revision)
            }).catch(function (err) {
              context.fail(util.format('Error: "%s"', err))
            })
          }).catch(function (err) {
            context.fail(util.format('Error: "%s"', err))
          })
          break
        default:
          context.fail(util.format('Unsupported notification channel: %s', key))
      }
    })
  })
}
