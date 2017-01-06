# Welcome to Lyssna
=================

Lyssna is a [Lambda](https://aws.amazon.com/documentation/lambda/) (node/javascript) library that subscribes to [CodeDeploy](https://aws.amazon.com/codedeploy/) [SNS](https://aws.amazon.com/documentation/sns/) events.

Lyssna takes these events and matches them with provided notification channels, and sends these events to those notifications channels.

How does it work?

1. The CodeDeploy publishes deploy event to a SNS topic.
2. Subscribers to that SNS topic - in this case Lyssna Lambda function - will execute.
3. During execution it looks at the SNS Event trigger name, SNS message application name and based on channel configurations sends a notification to these channels.

How does one create the SNS triggers, instructions can be found [here](http://docs.aws.amazon.com/codedeploy/latest/userguide/how-to-notify-sns.html)

## Configuration

To setup the triggers for notifications we need to configure which SNS events to trigger on.

These json files are stored in S3. Location is based on configuration from config/app.json

[Example of app configuration](https://github.com/karlnorling/lyssna/blob/master/config/app-example.json)

### To create configuration files and bundle app for upload:

1. Create a `s3` folder inside `./config`
2. Create configuration files based on examples in `./config`
3. In `./build` create a `config.json` file based on the example `config.sample.json` file.
4. Run `node build/archiver.js` - this will create a `lyssna-VERSION_NUMBER.zip` file.

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

### Screenshots

![Slack](http://i.imgur.com/sQ8iPcG.jpg)

### Upcoming notification channels:
-----
 - [jira](https://jira.com)
 - [asana](https://asana.com)

### Upcoming integrations:
-----
SNS CloudWatch alarms - adding support to notify on CloudWatch alarms.
GitHub Api - getting more information based on the commit SHA - for deployment details.

### Upcoming features:
-----
1. Upload functionality to s3 based on configured location.
2. Create Lambda function based on the uploaded zip file, create SNS Topic and IAM roles with permission, add triggers to CodeDeploy applications - all via CloudFormation templates.

### SNS CodeDeploy event examples
-----
 - [created](https://github.com/karlnorling/lyssna/blob/master/tests/mock/codedeploy-created.json)
 - [succeeded](https://github.com/karlnorling/lyssna/blob/master/tests/mock/codedeploy-succeeded.json)
 - [failed](https://github.com/karlnorling/lyssna/blob/master/tests/mock/codedeploy-failed.json)
 - [stopped](https://github.com/karlnorling/lyssna/blob/master/tests/mock/codedeploy-stopped.json)
