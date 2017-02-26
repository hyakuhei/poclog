## A simple logging platform for POCSAG messages

This is based on the example here:
https://www.ibm.com/developerworks/cloud/library/cl-bluemix-fundamentals-create-and-deploy-a-node-app-to-the-cloud/

The primary purpose of this project was for me to learn a little about
integrating with Bluemix, about using Travis-CI, Node.js and Cloudant.

This code is expected to run inside Cloud Foundry, Cloud Foundry will make
certain environment variables available to your application to use other
services that are in your application space.

If running locally rather than inside cloud foundry you must set similar
environment variables. Here a single environment variable **VCAP_SERVICES** is
set with the following json. Replace "value" with the appropriate settings
for your local or remote Cloudant instance.

```json
{
  "cloudantNoSQLDB": [
   {
    "credentials": {
     "host": "some_uuid_value-bluemix.cloudant.com",
     "password": "some_password_value",
     "port": 443,
     "url": "some_https_url_value-bluemix.cloudant.com",
     "username": "some_username_value-bluemix"
    },
    "label": "cloudantNoSQLDB",
    "name": "some_db_name_value",
    "plan": "some_plan_value",
    "provider": null,
    "syslog_drain_url": null,
    "tags": [
     "data_management",
     "ibm_created",
     "lite",
     "ibm_dedicated_public"
    ]
   }
  ]
}
```
