var express = require('express');
var request = require('request');
var Slack = require('slack-client');
var app = express();
var token = 'xoxb-10023260468-Ye69IQtL8pCJNlSOJGbUysKa';
var slack = new Slack(token, true, true);
var slackIncomingToken = 'YCQTpcBsvWVdoUXgvMKlWz48';
var options = {
  url: 'http://www.bungie.net/Platform/Destiny',
  headers: {
    'X-API-Key': '607f90a5823649b0b3781df292ae5181'
  }
};
var guardianClasses = [{'671679327': 'Hunter'},{'2271682572': 'Warlock'},{'3655393761': 'Titan'}];

var makeMention = function(userId) {
  return '<@' + userId + '>';
};

var getGamertag = function(text) {
  return text.substring(text.indexOf('[')+1,text.indexOf(']'));
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

var parseSlackMessage = function(trimmedMessage, channel, user){
  var keywords = ["help","characters","grimoire","inventory"];
  var finalMessage = '';
  keywords.forEach(function(key){
    if (trimmedMessage.indexOf(key) >= 0){
      switch(key){
        case 'help':
          channel.send(user.real_name + ', what would you like to know? I can currently assist you with:\n1. Character list\n2. Grimoire score\n3. Inventory list (soon)\n\n'+
            'Make a call using a keyword and the gamertag in brackets.\nExample: What\'s [NightSurgeX2]\'s grimoire score? (grimoire is the keyword)\n'+
            'Example Response: NightSurgeX2\'s grimoire score is 2450\n\nKeywords: ["characters","grimoire","inventory"]');
          break;
        case 'characters':
          var gamertag = getGamertag(trimmedMessage);
          request.get(options.url+'/SearchDestinyPlayer/1/'+gamertag, function(error, response, body){
            var membershipId = JSON.parse(response.body).Response[0].membershipId;
            request.get(options.url+'/1/Account/'+membershipId+'/Summary', function(error, response, body){
              var characters = JSON.parse(response.body).Response.data.characters.map( function(k){
                return {
                  id: k.characterBase.characterId,
                  type: guardianClasses[k.characterBase.classHash],
                  level: k.characterLevel,
                  emblem: 'http://www.bungie.net/'+k.emblemPath,
                  background: 'http://www.bungie.net/'+k.backgroundPath};
              } );
              channel.send(gamertag + "\'s characters are: " + JSON.stringify(characters));
            });
          });
          break;
        case 'grimoire':
          var gamertag = getGamertag(trimmedMessage);
          request.get(options.url+'/SearchDestinyPlayer/1/'+gamertag, function(error, response, body){
            var membershipId = JSON.parse(response.body).Response[0].membershipId;
            request.get(options.url+'/Vanguard/Grimoire/1/'+membershipId, function(error, response, body){
              var grimoireScore = JSON.parse(response.body).Response.data.score;
              channel.send(gamertag + "\'s grimoire score is: " + grimoireScore);
            });
          });
          break;
        case 'inventory':
          channel.send('Inventory is still a work in progress.');
          // var gamertag = getGamertag(trimmedMessage);
          // request.get(options.url+'/SearchDestinyPlayer/1/'+gamertag, function(error, response, body){
          //   var membershipId = JSON.parse(response.body).Response[0].membershipId;
          //   request.get(options.url+'/1/Account/'+membershipId+'/Summary', function(error, response, body){
          //     var characters = JSON.parse(response.body).Response.data.characters.map( function(k){
          //       return {id: k.characterBase.characterId, emblem: 'http://www.bungie.net/'+k.emblemPath, background: 'http://www.bungie.net/'+k.backgroundPath};
          //     } );
          //     channel.send(gamertag + "\'s grimoire score is: "+grimoireScore);
          //   });
          // });
          break;
        default:
          channel.send(user.real_name + ' said, "' + trimmedMessage + '" and I\'m too dumb to handle that.');
          break;
      }
    }
  });
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
    var trimmedMessage = message.text.substr(makeMention(slack.self.id).length).replace(':','').trim();
    var onlineUsers = getOnlineHumansForChannel(channel)
        .filter(function(u) { return u.id != user.id; })
        .map(function(u) { return makeMention(u.id); });

    parseSlackMessage(trimmedMessage, channel, user);
  }
});

slack.login();

//-------------------------------------------------------------------
//-------------------------------------------------------------------
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