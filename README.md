# Welcome to Lyssna
=================

Lyssna is a [Lambda](https://aws.amazon.com/documentation/lambda/) (node/javascript) library that subscribes to [CodeDeploy](https://aws.amazon.com/codedeploy/) [SNS](https://aws.amazon.com/documentation/sns/) events.

Lyssna takes these events and matches them with provided notification channels, and sends these events to those notifications channels.

How does it work?

1. The CodeDeploy publishes deploy event to a SNS topic.
2. Subscibers to that SNS topic - in this case Lyssna Lambda function - will execute.
3. During execution it looks at the SNS Event trigger name, SNS message application name and based on channel configurations sends a notification to these channels.

How does one create the SNS triggers, instructions can be found [here](http://docs.aws.amazon.com/codedeploy/latest/userguide/how-to-notify-sns.html)

## Configuration

To setup the triggers for notifications we need to configure what sns events to trigger on.

These json files are stored in S3. Location is based on configuration from config/app.json

(Example of app configuration)[https://github.com/karlnorling/lyssna/blob/master/config/app-example.json]

#### Notification channel config example (to be stored in S3) encrypted bucket)
-----
Example for notification configs:

 - [hipchat](https://github.com/karlnorling/lyssna/blob/master/config/hipchat-example.json)
 - [slack](https://github.com/karlnorling/lyssna/blob/master/config/slack-example.json)
 - [pagerduty](https://github.com/karlnorling/lyssna/blob/master/config/pagerduty-example.json)
 - [newrelic](https://github.com/karlnorling/lyssna/blob/master/config/newrelic-example.json)


### Deployer information
----
How do I know whom started the deploy?
Right now there's no user information in the CodeDeploy SNS event.
We can work around this by adding meta tags to the file in S3 that's getting deployed. That way we can get some user information.

Add a meta tag on the S3 object with the key of: **x-amz-meta-user**. The value should be whatever the user is that you want to be associated with the deploy.

### Supported notification channels:
-----
 - [hipchat](https://hipchat.com)
 - [newrelic](https://newrelic.com)
 - [pagerduty](https://pagerduty.com)
 - [slack](https://slack.com)

### Upcoming notification channels:
-----
 - [jira](https://jira.com)
 - [grove](https://grove.io)
 - [Bitrix24](https://bitrix24.com)
 - [yammer](https://www.yammer.com/)
 - [fleep](https://fleep.io)
 - [glitter](https://gitter.im/)
 - [glip](https://glip.com)
 - [ChatGrape](https://chatgrape.com/)
 - [flowdock](https://www.flowdock.com/)

### Upcoming integrations:
-----
SNS CloudWatch alarms - adding support to notify on CloudWatch alarms.
GitHub Api - getting more information based on the commit SHA - for deployment details.

### Upcoming features:
-----
1. npm build to create zip file of JavaScript code and upload it to configured s3 location.
2. Create Lambda function based on the uploaded zip file, create SNS Topic and IAM roles with permission, add triggers to CodeDeploy applications - all via CloudFormation templates.

### SNS CodeDeploy event examples
-----
 - [created](https://github.com/karlnorling/lyssna/blob/master/tests/mock/codedeploy-created.json)
 - [succeeded](https://github.com/karlnorling/lyssna/blob/master/tests/mock/codedeploy-succeeded.json)
 - [failed](https://github.com/karlnorling/lyssna/blob/master/tests/mock/codedeploy-failed.json)
 - [stopped](https://github.com/karlnorling/lyssna/blob/master/tests/mock/codedeploy-stopped.json)