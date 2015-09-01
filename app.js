var express = require('express');
var request = require('request');
var Slack = require('slack-client');
var app = express();
var token = 'xoxb-10023260468-Ye69IQtL8pCJNlSOJGbUysKa';
var slack = new Slack(token, true, true);
var slackIncomingToken = 'YCQTpcBsvWVdoUXgvMKlWz48';

var makeMention = function(userId) {
  return '<@' + userId + '>';
};

var isDirect = function(userId, messageText) {
  var userTag = makeMention(userId);
  return messageText &&
         messageText.length >= userTag.length &&
         messageText.substr(0, userTag.length) === userTag;
};

var getOnlineHumansForChannel = function(channel) {
  if (!channel) return [];

  return (channel.members || [])
      .map(function(id) { return slack.users[id]; })
      .filter(function(u) { return !!u && !u.is_bot && u.presence === 'active'; });
};

slack.on('open', function () {
  var channels = Object.keys(slack.channels)
      .map(function (k) { return slack.channels[k]; })
      .filter(function (c) { return c.is_member; })
      .map(function (c) { return c.name; });

  var groups = Object.keys(slack.groups)
      .map(function (k) { return slack.groups[k]; })
      .filter(function (g) { return g.is_open && !g.is_archived; })
      .map(function (g) { return g.name; });

  console.log('Welcome to Slack. You are ' + slack.self.name + ' of ' + slack.team.name);

  if (channels.length > 0) {
    console.log('You are in: ' + channels.join(', '));
  }
  else {
    console.log('You are not in any channels.');
  }

  if (groups.length > 0) {
    console.log('As well as: ' + groups.join(', '));
  }
});

slack.on('message', function(message) {
  var channel = slack.getChannelGroupOrDMByID(message.channel);
  var user = slack.getUserByID(message.user);

  if (message.type === 'message' && isDirect(slack.self.id, message.text)) {
    var trimmedMessage = message.text.substr(makeMention(slack.self.id).length).trim();
    var onlineUsers = getOnlineHumansForChannel(channel)
        .filter(function(u) { return u.id != user.id; })
        .map(function(u) { return makeMention(u.id); });

    if (trimmedMessage.indexOf('grimoire') >= 0){
      var gamertag = trimmedMessage.substring(trimmedMessage.indexOf('[')+1,trimmedMessage.indexOf(']'));
      request.get(options.url+'/SearchDestinyPlayer/1/'+gamertag, function(error, response, body){
        var membershipId = JSON.parse(response.body).Response[0].membershipId;
        request.get(options.url+'/Vanguard/Grimoire/1/'+membershipId, function(error, response, body){
          var grimoireScore = JSON.parse(response.body).Response.data.score;
          channel.send(gamertag + "\'s grimoire score is: "+grimoireScore);
        });
      });
    } else {
      channel.send(onlineUsers.join(', ') + '\r\n' + user.real_name + ' said: "' + trimmedMessage + '" and I\'m too dumb to handle that.');
    }
  }
});

slack.login();
//-------------------------------------------------------------------


var options = {
  url: 'http://www.bungie.net/Platform/Destiny',
  headers: {
    'X-API-Key': '607f90a5823649b0b3781df292ae5181'
  }
};

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.get('/guardian/:gamertag', function (req, res) {
  request.get(options.url+'/SearchDestinyPlayer/1/'+req.params.gamertag, function(error, response, body){
    res.send(JSON.parse(response.body));
  });
});

app.get('/guardian/:gamertag/grimoire', function (req, res) {
  var membershipId = '';
  request.get(options.url+'/SearchDestinyPlayer/1/'+req.params.gamertag, function(error, response, body){
    membershipId = JSON.parse(response.body).Response[0].membershipId;
    request.get(options.url+'/Vanguard/Grimoire/1/'+membershipId, function(error, response, body){
      var grimoireScore = JSON.parse(response.body).Response.data.score;
      res.send("Your score is: "+grimoireScore);
    });
  });
});

var server = app.listen(process.env.PORT || 3002, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});