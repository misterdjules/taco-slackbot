const http = require('http');

const assert = require('assert-plus');
const Slack = require('slack-client');

const SLACK_TOKEN = process.env.SLACK_TOKEN;
assert.string(SLACK_TOKEN, 'The SLACK_TOKEN environment variable must be set');

// 'tacoday_api' is the hostname setup by docker links in the /etc/hosts
// file of the running container. It points to the tacoday API server if
// the container is linked to a tacoday API server.
// When not running as a linked container, one can specify the hostname
// of the tacoday API server with the TACODAY_API_HOST environment variable.
const TACODAY_API_HOST = process.env.TACODAY_API_HOST || 'tacoday_api';
assert.string(TACODAY_API_HOST, 'TACODAY_API_HOST must be a string');

// TACODAY_API_PORT_8080_TCP_PORT is the name of the environment variable
// set by docker when linking this container to the tacoday-api container.
// If this variable is not present, default to a TACODAY_API_PORT environment
// variable that may have been specified when starting the program, otherwise
// hardcode it to a default static value.
const TACODAY_API_PORT = Number(process.env.TACODAY_API_PORT_8080_TCP_PORT) ||
    Number(process.env.TACODAY_API_PORT) || 8080;
assert.number(TACODAY_API_PORT, 'TACODAY_API_PORT must be a number');

const autoReconnect = true;
const autoMark = true;

const slack = new Slack(SLACK_TOKEN, autoReconnect, autoMark);

slack.on('open', function onOpen() {
    console.log(`Connected to ${slack.team.name} as ${slack.self.name}`);
});

slack.on('message', function onMessage(message) {
    var channel;
    var wotdReq;
    var wotdApiEndpoint =
        `http://${TACODAY_API_HOST}:${TACODAY_API_PORT}/wotd`;

    if (message.text && /wotd/i.test(message.text)) {
        channel = slack.getChannelGroupOrDMByID(message.channel);        
        wotdReq = http.get(wotdApiEndpoint, function onWotdRes(res) {
            var wotd = '';

            if (res.statusCode === 200) {
                res.on('data', function onData(data) {
                    wotd += data.toString();
                });

                res.on('end', function onEnd() {
                    channel.send('Si señor! The word of the day is ' + wotd +
                        '!');
                });
            } else {
                channel.send('Sorry señor, I couldn\'t get the word of the ' +
                    'day  this time!');
                return;
            }
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
