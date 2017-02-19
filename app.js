/*jshint node:true*/


// This application uses express as it's web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');
var websiteTitle = require('./websitetitle');
var cloudant = require('cloudant');

//get environment information
var appEnv = cfenv.getAppEnv();
var cloudant_url;
var cf_env;
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
  console.warn("No CF_ENV");
  console.warn('export CF_ENV="$(cat env.json)"')
}


// create a new express server
var app = express();
app.use(express.static('public'));
// serve the files out of ./public as our main files
app.set('view engine', 'jade');

app.get('/', function (req, res) {
  res.render('home', {title: websiteTitle.getTitle()});
});
app.get('/alaska', function (req, res) {
  res.render('alaska',  {title: websiteTitle.getTitle()});
});
app.get('/antarctica', function (req, res) {
  res.render('antarctica',  {title: websiteTitle.getTitle()});
});
app.get('/australia', function (req, res) {
  res.render('australia',  {title: websiteTitle.getTitle()});
});
app.get('/env', function(req, res) {
  res.render('env', {title: websiteTitle.getTitle(), creds: services.cloudantNoSQLDB[0].credentials} );
});

// get the app environment from Cloud Foundry

// start server on the specified port and binding host
app.listen(appEnv.port, appEnv.bind, function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
