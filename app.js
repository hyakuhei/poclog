/*jshint node:true*/


// This application uses express as it's web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');
var websiteTitle = require('./websitetitle');
var Cloudant = require('cloudant');

//get environment information
var appEnv = cfenv.getAppEnv();
var cloudant_url;
var services;
if(process.env.VCAP_SERVICES){
  services = JSON.parse(process.env.VCAP_SERVICES);
  if(services.cloudantNoSQLDB){
    cloudant_url = services.cloudantNoSQLDB[0].credentials.url;
    console.log("Name = " + services.cloudantNoSQLDB[0].name);
    console.log("URL = " + services.cloudantNoSQLDB[0].credentials.url);
    console.log("username = " + services.cloudantNoSQLDB[0].credentials.username);
  }else{
    console.error("No cloudantNoSQLDB service available")
    console.log(services)
  }
}else{
  console.warn("No VCAP_SERVICES");
  console.warn("If running locally to run the following:")
  console.warn('export CF_ENV="$(cat env.json)"')
}

creds = services.cloudantNoSQLDB[0].credentials;
cloudant = Cloudant({url: creds.url, username: creds.username, password:creds.password}),
db = cloudant.db.use("poclog-dev")
dbindex = "json: poclog-utime"
dbquery = {
  "selector": {
    "poclog-utime": {
      "$gt": 0
    }
  },
  "fields": [
    "ric",
    "name",
    "time",
    "date",
    "message"
  ],
  "sort": [
    {
      "poclog-utime": "asc"
    }
  ]
}

// create a new express server
var app = express();
app.use(express.static('public'));
// serve the files out of ./public as our main files
app.set('view engine', 'jade');

app.get('/', function (req, res) {
  res.render('home', {title: websiteTitle.getTitle()});
});

app.get('/ingest', function (req, res){
  var parms = req.query
  parms['poclog-utime'] = Date.now()
  console.log(req.query['ric'])
  db.insert(parms, function(err, body, header){
    if (err) {
      return console.log('insert error', err.message)
    }
    console.log("Added record")
  })
  res.status(200).end()
});

app.get('/env', function(req, res) {
  //Fetch an ordered list of records to pass to the rendererererer
  db.find(dbquery, function(err, result){
    if (err){
      return console.warn(err)
    }
    console.log('Found %d documents that match query', result.docs.length);
    res.render('env', {title: websiteTitle.getTitle(), results:result.docs});
  })
});

// get the app environment from Cloud Foundry

// start server on the specified port and binding host
app.listen(appEnv.port, appEnv.bind, function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
