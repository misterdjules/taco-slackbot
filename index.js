const assert = require('assert-plus');
const http = require('http');

const Slack = require('slack-client');

const SLACK_TOKEN = process.env.SLACK_TOKEN;
assert.string(SLACK_TOKEN, 'The SLACK_TOKEN environment variable must be set');

const TACODAY_API_ADDR = process.env.TACODAY_API_PORT_8080_TCP_ADDR ||
    'localhost';
assert.string(TACODAY_API_ADDR,
    'The TACODAY_API_PORT_8080_TCP_ADDR environment variable must be set');

const autoReconnect = true;
const autoMark = true;

const slack = new Slack(SLACK_TOKEN, autoReconnect, autoMark);

slack.on('open', function onOpen() {
    console.log(`Connected to ${slack.team.name} as ${slack.self.name}`);
});

slack.on('message', function onMessage(message) {
    var channel;
    var wotdReq;
    var wotdApiEndpoint = `http://${TACODAY_API_ADDR}:8080/wotd`;

    if (message.text && /wotd/i.test(message.text)) {
        channel = slack.getChannelGroupOrDMByID(message.channel);        
        wotdReq = http.get(wotdApiEndpoint, function onWotdRes(res) {
            var wotd = '';
            res.on('data', function onData(data) {
                wotd += data.toString();
            });

            res.on('end', function onEnd() {
                channel.send('Si señor! The word of the day is ' + wotd + '!');
            });
        });

        wotdReq.on('error', function onError(err) {
            console.log('error:', err);
            channel.send('Sorry señor, I couldn\'t get the word of the day ' +
            'this time!');
        });
    }
});

slack.on('error', function onError(err) {
    console.error("Error", err);
})

slack.login();
