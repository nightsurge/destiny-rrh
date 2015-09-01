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

app.post('/slackbot', function (req, res){
  console.log('Incoming request: \n');
  console.log(req.params);
  var membershipId = findDestinyMemberId('nightsurgex2');
  var grimoireScore = findDestinyGrimoire(membershipId);
  slack.api('chat.postMessage', {
    text: "Your score is: "+grimoireScore,
    channel:'#test',
    as_user: false,
    username: 'destiny-bot'
  }, function(sl_err, sl_resp){
    console.log(sl_resp);
  });
});

app.get('/guardian/:gamertag', function (req, res) {
  res.send(findDestinyMemberId(req.params.gamertag));
});

app.get('/guardian/:gamertag/grimoire', function (req, res) {
  var membershipId = findDestinyMemberId(req.params.gamertag).Response[0].membershipId;
  res.send(findDestinyGrimoire(membershipId));
});

function findDestinyMemberId(gamertag){
  request.get(options.url+'/SearchDestinyPlayer/1/'+gamertag, function(error, response, body){
    return JSON.parse(response.body);
  });
}

function findDestinyGrimoire(membershipId){
  request.get(options.url+'/Vanguard/Grimoire/1/'+membershipId, function(error, response, body){
    return JSON.parse(response.body).Response.data.score;
  });
}

var server = app.listen(process.env.PORT || 3002, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});