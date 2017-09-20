/*jshint node:true*/

/*eslint no-magic-numbers: ["error", { "ignoreArrayIndexes": true }]*/
/*eslint no-process-env: "error"*/

// This application uses express as it's web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');
var fs = require('fs');
var websiteTitle = require('./websitetitle');
var Cloudant = require('cloudant');
var passport = require('passport');
var helmet = require('helmet');
var Strategy = require('passport-http').BasicStrategy;
var bcrypt = require('bcrypt');
var util = require('util')
var authnQuery = require('./queries/authentication.json');
var defaultRecordQuery = require('./queries/default_records.json');

var MESSAGE_MASK = "MESSAGE_MASK";

//get environment information
//This is the magic that lets it work in Bluemix
var appEnv = cfenv.getAppEnv();
var services = null;

if (process.env.VCAP_SERVICES){
  services = JSON.parse(process.env.VCAP_SERVICES);
  if (services.cloudantNoSQLDB) {
    console.log("Name = " + services.cloudantNoSQLDB[0].name);
    console.log("URL = " + services.cloudantNoSQLDB[0].credentials.url);
    console.log(
      "username = " + services.cloudantNoSQLDB[0].credentials.username);
  } else {
    console.error("No cloudantNoSQLDB service available");
    console.log(services);
  }
} else {
  console.warn("No VCAP_SERVICES");
  console.warn("If running locally to run the following:");
  console.warn('export VCAP_SERVICES="$(cat vcap_services.json)"');
  throw new Error("Cannot run without VCAP_SERVICES");
}

var creds = services.cloudantNoSQLDB[0].credentials;
var cloudant = Cloudant({
  "password": creds.password,
  "url": creds.url,
  "username": creds.username
  }),
  db = cloudant.db.use("poclog-dev");

//Load queries from the paths set above
var getRecordQuery = function(err) {
  if (err) {
    return err;
  }

  if (process.env.DAYLIMIT) {
    console.log("returning query limited to " + process.env.DAYLIMIT + " days")
    var recordQuery = defaultRecordQuery;
    var past = Date.now() - (1000 * 60 *60 * 24 * process.env.DAYLIMIT);
    recordQuery["selector"]["poclog-utime"]["$gt"] = past;
    return recordQuery;
  }
  console.log("DAYLIMIT not set, returning default query")
  return defaultRecordQuery;
};


function compareResult (a,b) {
  if (a['poclog-utime'] > b['poclog-utime']){
    return -1;
  }
  if (a['poclog-utime'] < b['poclog-utime']){
    return 1;
  }
  return 0;
}

passport.use(new Strategy(
  function(username, password, done){
    var uq = authnQuery;
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
        return done(null, false);
      }
    });
  }
));

// create a new express server
var app = express();
app.use(helmet());
app.use(express.static('public'));
// serve the files out of ./public as our main files
app.set('view engine', 'jade');

app.get('/ingest', function (req, res){
  var parms = req.query;
  parms['poclog-utime'] = Date.now();
  console.log(req.query['ric']);
  db.insert(parms, function(err, body, header){
    if (err) {
      return console.log('insert error', err.message);
    }
    console.log("Added record");
  })
  res.status(200).end();
});

app.get('/', passport.authenticate('basic', {session:false}), function(req, res) {
  var recordQuery = getRecordQuery();
  console.log(recordQuery)
  db.find(recordQuery, function(err, result){
    if (err){
      return console.warn(err);
    }
    //For some reason sort doesn't work
    console.log('Found %d documents that match query', result.docs.length);
    result.docs.sort(compareResult);
    res.render('env', {title: websiteTitle.getTitle(), results:result.docs});
  })
});

// get the app environment from Cloud Foundry
// start server on the specified port and binding host
console.log("Listening on: " + appEnv.bind)
app.listen(appEnv.port, appEnv.bind, function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
