# Welcome to Lyssna
=================

Lyssna is a lambda (node/javascript) library that subscribes to codedeploy SNS events.

Lyssna takes these events and matches them with provided notification channels, and sends these events to those notifications channels.

Supported notification channels:
-----
 - hipchat
 - newrelic
 - pagerduty

Upcoming notification channels:
-----
 - Bitrix24
 - slack
 - hall
 - pie
 - yammer
 - fleep
 - glitter
 - glip
 - ChatGrape
 - flowdock
 - asana
 - jitsi
 - Azendoo

Upcoming integrations:
-----
GitHub Api - getting more information based on the commit SHA - for deployment details.

SNS codedeploy event json example:
```json
{
  "Records": [{
    "EventSource": "aws:sns",
    "EventVersion": "1.0",
    "EventSubscriptionArn": "arn:aws:sns:us-east-1:905260852223:hipchat_notification:49343f9b-237f-4ff5-9e3f-0da23ffde19e",
    "Sns": {
      "Type": "Notification",
      "MessageId": "45c8b1bf-9d80-5274-b22a-fedd5a1b48d1",
      "TopicArn": "arn:aws:sns:us-east-1:905260852223:hipchat_notification",
      "Subject": "unknown: AWS CodeDeploy d-KMJOV59NE in us-east-1 to web-referral",
      "Message": "{\"region\":\"us-east-1\",\"accountId\":\"905260852223\",\"eventTriggerName\":\"BackOffice Notification\",\"applicationName\":\"web-referral\",\"deploymentId\":\"d-KMJOV59NE\",\"deploymentGroupName\":\"production\",\"createTime\":\"Wed Mar 16 02:30:50 UTC 2016\",\"completeTime\":null,\"status\":\"unknown\"}",
      "Timestamp": "2016-03-16T02:30:51.405Z",
      "SignatureVersion": "1",
      "Signature": "Fc18UP+tJisMYmzuOjVtNN2t+qzVCrqgUq9EvUBY82NwMf0LgxlSp8FM9uxFQRnlJaahxDykUyPYPNHPmLcox5A13fiudw7miKYlKRaaKobmdPQoY+lVKvm6hBpq0CKUG64YUQgHeXDuk1mUqE0L+hxj9rqJc6yZdRL96KpNLnMX3VRKw8+WELgycjJsywbaSjFqdDm2cXv76Ngwq+blYkAP5uneIzVkCHvNMsqA0iRug3yTxonV+Soz9p5b+OzJw75SaYgJqWLaGneeYqck6Vun88etssdNpbaVV0iCR600JA+lhyP7py6ON9+Z5IUtnsESB0+YJ8L59Ycvn78B9A==",
      "SigningCertUrl": "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-bb750dd426d95ee9390147a5624348ee.pem",
      "UnsubscribeUrl": "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:905260852223:hipchat_notification:49343f9b-237f-4ff5-9e3f-0da23ffde19e",
      "MessageAttributes": {}
    }
  }]
}
```
##Configuration

To setup the triggers for notifications we need to configure what sns events to trigger on.
Below is an example on how the config/app.json file might look.
```json
{
  "snsEventTriggers": {
    "Name of your SNS event": {
      "hipchat": {
        "s3": {
          "bucket": "s3.bucket/name",
          "key": "path/to/file/in/s3.json"
        }
      },
      "newrelic": {
        "s3": {
          "bucket": "s3.bucket/name",
          "key": "path/to/file/in/s3.json"
        }
      },
      "pagerduty": {
        "s3": {
          "bucket": "s3.bucket/name",
          "key": "path/to/file/in/s3.json"
        }
      }
    }
  }
}
```

#Notification channel config example (to be stored in S3 encrypted bucket)

Example below is for hipchat notifications.
```json
{
  "apiKey": "xxxxxxxxxxxxxxxx",
  "applications": [{
    "applicationName": "web-referral",
    "rooms": [{
      "userName": "LambdaNotify",
      "id": "xxxxxx"
      }],
    "templates": {
      "failed": "Deployment (%s) of %s with revision %s to %s failed with error message \"%s\".",
      "created": "Deployment (%s) of %s with revision %s to %s has started.",
      "succeeded": "Deployment (%s) of %s with revision %s to %s was successful.",
      "stopped": "Deployment (%s) of %s with revision %s to %s has finished.",
      "unknown": "Deployment (%s) of %s with revision %s to %s with status %s.",
      "user": "Deployment by %s."
    }
  }]
}
```
Example below is for hipchat notifications.
```json
{
  "apiKey": "xxxxxxxxxxxxxxxx",
  "deploymentsApiUri": "https://api.newrelic.com/deployments.xml",
  "applications": [{
    "applicationName": "web-referral",
    "applicationId": "xxxxxxxxxxxxxxxx",
    "templates": {
      "succeeded": "%s"
    }
  }]
}
```
Example below is for pagerduty trigger.
```json
{
  "apiKey": "xxxxxxxxxxxxxxxx",
  "pagerDutyApiUri": "https://events.pagerduty.com/generic/2010-04-15/create_event.json",
  "applications": [
    {
      "applicationName": "web-referral",
      "options": {
        "service_key": "xxxxxxxxxxxxxxxx",
        "event_type": "trigger",
        "description": "",
        "incident_key": "",
        "client": "",
        "client_url": "",
        "details": {},
        "contexts": [{
          "type": "",
          "href": "",
          "text": ""
        }]
      },
      "templates": {
        "failed": "%s"
      }
    }
  ]
}
```