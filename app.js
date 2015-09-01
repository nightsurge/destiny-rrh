var express = require('express');
var request = require('request');
var Slack = require('slack-node');
var app = express();

var apiToken = 'xoxb-10023260468-Ye69IQtL8pCJNlSOJGbUysKa';
var slackIncomingToken = 'YCQTpcBsvWVdoUXgvMKlWz48';
var options = {
  url: 'http://www.bungie.net/Platform/Destiny',
  headers: {
    'X-API-Key': '607f90a5823649b0b3781df292ae5181'
  }
};

slack = new Slack(apiToken);

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/guardian/:gamertag', function (req, res) {
  request.get(options.url+'/SearchDestinyPlayer/1/'+req.params.gamertag, function(error, response, body){
    res.send(JSON.parse(response.body));
  });
});

app.get('/guardian/:gamertag/grimoire', function (req, res) {
  console.log(req);
  var membershipId = '';
  request.get(options.url+'/SearchDestinyPlayer/1/'+req.params.gamertag, function(error, response, body){
    membershipId = JSON.parse(response.body).Response[0].membershipId;
    request.get(options.url+'/Vanguard/Grimoire/1/'+membershipId, function(error, response, body){
      var grimoireScore = JSON.parse(response.body).Response.data.score;
      slack.api('chat.postMessage', {
        text: "Your score is: "+grimoireScore,
        channel:'#nightsurgex2',
        as_user: true
      }, function(err, response){
        console.log(response);
      });
      res.send("Your score is: "+grimoireScore);
    });
  });
});

var server = app.listen(process.env.PORT || 3002, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});