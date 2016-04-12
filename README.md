# Welcome to Lyssna
=================

Lyssna is a [Lambda](https://aws.amazon.com/documentation/lambda/) (node/javascript) library that subscribes to [CodeDeploy](https://aws.amazon.com/codedeploy/) [SNS](https://aws.amazon.com/documentation/sns/) events.

Lyssna takes these events and matches them with provided notification channels, and sends these events to those notifications channels.

How does it work?

1. The CodeDeploy publishes deploy event to a SNS topic.
2. Subscibers to that SNS topic - in this case Lyssna Lambda function - will execute.
3. During execution it looks at the SNS Event trigger name, SNS message application name and based on channel configurations sends a notification to these channels.

How does one create the SNS triggers, instructions can be found [here](http://docs.aws.amazon.com/codedeploy/latest/userguide/how-to-notify-sns.html)


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
GitHub Api - getting more information based on the commit SHA - for deployment details.

### Upcoming features:
-----
Build system: Implement npm build to generate lambda function in aws, upload lambda js code to configures [S3](https://aws.amazon.com/documentation/s3/) and create sns topic/subscribers for applicaitons in CodeDeploy based on CloudFormation template.
Upload system: Upload application configuration and channel configuration files to configured S3 bucket in AWS

### SNS CodeDeploy event examples
-----
 - [created](https://github.com/karlnorling/lyssna/blob/master/test/mock/codedeploy-created.json)
 - [succeeded](https://github.com/karlnorling/lyssna/blob/master/test/mock/codedeploy-succeeded.json)
 - [failed](https://github.com/karlnorling/lyssna/blob/master/test/mock/codedeploy-failed.json)
 - [stopped](https://github.com/karlnorling/lyssna/blob/master/test/mock/codedeploy-stopped.json)

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