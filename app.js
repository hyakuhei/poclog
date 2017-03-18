/*jshint node:true*/


// This application uses express as it's web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');
var websiteTitle = require('./websitetitle');
var Cloudant = require('cloudant');
var passport = require('passport');
var helmet = require('helmet')
var Strategy = require('passport-http').BasicStrategy

// Use bcrypt for password hashes
var bcrypt = require('bcrypt');

//get environment information
//This is the magic that lets it work in Bluemix
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
  console.warn('export VCAP_SERVICES="$(cat env.json)"')
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
      "poclog-utime": "desc"
    }
  ]
}

userQuery = {
  "selector": {
    "username": {
      "$eq": null
    }
  },
  "fields": [
    "username",
    "hash"
  ],
  "sort": [
    {
      "_id": "asc"
    }
  ]
}

dbquery_timebounded = {
  "selector":{
        "$or":[
          {"$nor":[
            {"message": "Daily Transmitter Test"},
            {"message": "System Test from Telent"},
            {"message": "System Test"},
            {"message":"TONE ONLY"}
          ]},
          {"poclog-utime":{"$gte":0}}
        ]
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
      "poclog-utime": "desc"
    }
  ]
}

passport.use(new Strategy(
  function(username, password, done){
    var uq = userQuery
    uq['selector']['username'] = username;
    db.find(uq, function(err, result){
      if (err){
        console.log("Could not find user: " + username);
        return done(err);
      }
      //Check password from result against
      if(bcrypt.compareSync(password, result.docs[0]['hash'])){
        return done(null, username);
      }else{
        return done(null, false)
      }
    })
  }
))

// create a new express server
var app = express();
app.use(helmet())
app.use(express.static('public'));
// serve the files out of ./public as our main files
app.set('view engine', 'jade');

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

app.get('/', passport.authenticate('basic', {session:false}), function(req, res) {

  //Fetch an ordered list of records to pass to the rendererererer
  var q = dbquery_timebounded;
  var now = Date.now();
  try{
    //This is brittle, if you cahnge the query this will break
    q['selector']['$or'][1]['poclog-utime']['$gte'] = now - (1000*60*60*24);
  } catch (ex) {
      console.log('Cannot set time for timebound query. Did the query change without updating here?')
      console.log('Defaulting to simple query')
      q = dbquery;
  }

  db.find(q, function(err, result){
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
