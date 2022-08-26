/*
----- imports ... -----

* express, http, socket.io for creating a websocket server 
* stuff from twitter-api-v2 in order to stream from twitter api
* node-rdkafka to set up the kafka pipeline:
    - producer sends rsw twitter data to kafka topic "raw"
        * ML classifier (python) tranforms data, sends to kafka topic "processed"
    - consumer receives tranformed data from "processed" topic
        * displays in a ChartJS Donut Chart
*/

import express from 'express';
import { ETwitterStreamEvent, TweetStream, TwitterApi, ETwitterApiError } from 'twitter-api-v2';
import Kafka from 'node-rdkafka';
import { createServer } from 'http';
import { Server } from 'socket.io';

// ---------- KAFKA / TWIITER API SETUP ---------- \\

// Kafka Producer
const kafkaStream = Kafka.Producer.createWriteStream({
    // define brokers
    'metadata.broker.list': 'localhost:9092',
}, {}, { topic: 'raw' } );


// Twitter API stream setup

const bearer_token = 'AAAAAAAAAAAAAAAAAAAAAErnaQEAAAAA79KakAgEZuJSn7UhFC1EEfmBJMI%3DC7A5zAlcGQIBueHk3DeGtSpWWEUEEJtFebWT1nNfqtn5fzxzPz';
const client = new TwitterApi(bearer_token);

// ---------------------------------------------------------------------- \\
// *** Need to apply for Elevated Access in order to use v1 endpoints ***


const v1Client = new TwitterApi({
    appKey: 'I4ZrGFucRA7nbvRUQEBBOGPIV',
    appSecret: 'gHmHJ61G3d23qXQhj0rejHoVaAwI0aQ5un9xcL2acY496yA6k6',
    accessToken: '778428611980177408-c4j4sKU1xGzL3vlsUaqCgVsRaM1GV85',
    accessSecret: '2uZMMBGKg6k2uenlFnIrv65tA1uJkkSoMzGmDSmwwq0bj'
});


const filterStream = await client.v1.filterStream({
    track: 'mask covid-19',
    autoConnect: false
});

// ---------------------------------------------------------------------- \\

// on server start, reset the rules to the default ones regarding masks and covid
var currentRules = await client.v2.streamRules();
var idsToDelete = [];

if (currentRules.length > 0) {
    currentRules.data.forEach(r => {
        if (r.tag !== 'init') {
            idsToDelete.push(r.id);
        }
    });
}


var deletedRules, addedRules;

if (idsToDelete.length > 0) {
    deletedRules = await client.v2.updateStreamRules({
        delete: {
            ids: idsToDelete
        }
    });
}


addedRules = await client.v2.updateStreamRules({
    // rules define how to filter content from Twitter
    // in this case, we want tweets related tocovid-19
    add: [
        { value: 'mask (covid-19 OR covid OR coronavirus)', tag: 'init'},
        { value: 'mask (indoors OR outdoors OR spread)', tag: 'init'},
    ]   
});

const twitterStream = await client.v2.searchStream({autoConnect: false});

twitterStream.on(ETwitterStreamEvent.ConnectionClosed, () => console.log('Twitter Stream has stopped.'));
twitterStream.on(ETwitterStreamEvent.Connected, () => console.log('Twitter stream has started.')).on(
    ETwitterStreamEvent.Data,
    eventData => {
        // twitter stream receives data -> forward data to kafka
        var success = kafkaStream.write(Buffer.from(eventData["data"]["text"]));
        if (success) {
            console.log('Writing twitter data...');
        } else {
            console.log('error writing to kafka');
        }
    }
);


// Kafka Consumer
const consumer = Kafka.KafkaConsumer({
    // define brokers
    'group.id': 'kafka',
    'metadata.broker.list': 'localhost:9092',

}, {/*options*/});


consumer.on('ready', () => {
    console.log('Consumer ready.');
    consumer.subscribe(['processed']);
    consumer.consume();
})

// ---------------------------- WEBSOCKET SERVER SETUP ------------------------------- \\
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

consumer.on('data', (data) => {

    // consumer.commit();
    var consumerData = JSON.parse(data.value);

    if (consumerData.sentiment === 'Positive') {
        numPositive += 1;

    } else {
        numNegative += 1;
    }

    // console.log(consumerData);

    io.emit('tweet', {
        'numPositive': numPositive,
        'numNegative': numNegative,
        'tweet': consumerData.text
    });
});  

app.use(express.static('public'));

var numPositive = 0;
var numNegative = 0;

var topic = "masks";

io.on('connect', async function(sock) {

    currentRules = await client.v2.streamRules();

    console.log('websocket connected.');
    io.emit('topic', topic);

    sock.on('start', function(data) {

        consumer.connect();
        twitterStream.connect();
    });

    sock.on('end', function(data) {

        twitterStream.close();
        consumer.disconnect();
    });


// ------------- RESETTING CHART --------------------- \\

    sock.on('reset', function(data) {

        numNegative = 0;
        numPositive = 0;
    });

// ------------- HANDLING CHAGE OF TOPIC ------------- \\

    // User answers questionnaire

    sock.on('q', async function(data) {

        // reset chart data
        numNegative = 0;
        numPositive = 0;
        
        topic = data.topic;

        var currentRules = await client.v2.streamRules();
        
        try {

            idsToDelete = currentRules.data.map(r => r.id);

        } catch (e) {

        }
        

        // text inputs
        var terms = [];
        var rule = topic;
        
        if (data.or !== '') {

            const orTerms = data.or.split();
            orTerms.map(t => t.trim());

            var orRule = '';
            orTerms.forEach(t => {
                orRule += ` OR ${t}`;
            });

            orRule = `${topic}${orRule}`;

            rule = orRule;
        }

        if (data.and !== '') {

            // wrap OR terms in parenthesis to preserver order of operations
            rule = `(${rule})`;
    
            const andTerms = data.and.split();
            andTerms.map(t => t.trim());

            var andRule = '';
            andTerms.forEach(t => {
                andRule += ` AND ${t}`;
            });

            rule += andRule;
        }


        const orRuleOnly = orRule || "";
        const andRuleOnly = andRule || "";
        // hashtag and users

        if (data.hasOwnProperty('onlyHashtags')) {

            var hashtags = data.hashtags.split();
            hashtags = hashtags.map(h => h.trim());

            // wrap in parenthesis -> we still want to match the original rule,
            // but also allow from the hashtag (but still only matching the terms in the rule)
            if (data.onlyHashtags === 'NO') { rule = `(${rule}) OR ((${orRuleOnly})${andRuleOnly}`; }

            hashtags.forEach(h => {
                rule += ` ${h}`;
            });

            if (data.onlyHashtags === 'NO') { rule += ')'; }
            
        } if (data.hasOwnProperty('onlyUsers')) {

            var users = data.users.split(',');
            users = users.map(u => u.trim());

            if (data.onlyUsers === 'NO') { rule = `(${rule}) OR ((${orRuleOnly})${andRuleOnly}` }

            users.forEach(u => {
                rule += ` from:${u}`;
            });

            if (data.onlyUsers === 'NO') { rule += ')'; }
        }

        console.log('new rule: ', rule);

        
        deletedRules = await client.v2.updateStreamRules({

            // delete current rules
            delete: {
                ids: idsToDelete
            }
        });

        
        addedRules = await client.v2.updateStreamRules({

            add: [
                { value: `${rule}`, tag: 'questionnaire' }
            ]
        });
        
        currentRules = await client.v2.streamRules();
    });
});


httpServer.listen(process.env.PORT || 3000);