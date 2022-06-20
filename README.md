# Sentiment Analyzer #

Welcome to SentimentAnalyzer, a web-based tool hooked directly up to the Twitter API to bring you what people are thinking, right now.

Give SentimentAnalyzer a topic – preferably a polarizing one – and it will display, in real time, the percentage of tweets coming in that are saying **good things** about that topics versus those that are saying **bad things** about it.

If you want to see the tweets that are being analyzed, inspect element on your browser and open the console.


## Overview:

### TL;DR:

Twitter API -> Kafka topic -> BayesClassifier -> Separate Kafka topic -> Server -> Client.

### Technologies used:

* Apache Kafka 3.2 with Zookeeper 3.8
* Node.js 16.13.2
* Python 3.9

The Node.js web server was created using express and [socket.io](https://socket.io/docs/v4/). This enables two-way, realtime communuication betwee the client and server. Since Kafka and the Twitter API also used WebSocket, there is essentially realtime communication between all 4 components.

Tweets are classified as *Positive* or *Negative* using the Naive Bayes Classifier from the [nltk](https://www.nltk.org/_modules/nltk/classify/naivebayes.html) package in python.

Raw text data is streamed from the Twitter API to a Kafka topic and then fed to the classifier. The classifications are then streamed to a separate kafka topic, which forwards them to the server and eventually the client.

When the server is started, two sets of Kafka Producers and Consumers are initialized: one in python, and one in node.js. We shall refer to the former set as P.consumer, P.producer and the latter set as N.consumer, N.producer ("P" for python and "N" for node).

Upon server start, most of the pipline is set up. N.producer, P.consumer and P.producer connect to the broker. N.producer is ready to receive data from Twitter and send it to the "raw" topic, P.consumer is ready to receive that data and feed it to the classifier, and P.producer is ready to send the transformed data to the "processed" topic.

When the user clicks *Start Stream*, an event is emitted from the client to the server that tells the server to create a connection with the Twitter API. N.Consumer connects to the broker and awaits data from "processed" topic, completing the pipeline. Once the Twitter stream is initiated, data begins to flow:

Twitter API -> "Raw" (via N.producer) -> BayesClassifier (via P.consumer) -> "Processed" (via. P.producer) -> Server (via N.consumer) -> Client (via socket.io)

Once the transformed data is received by the server, the server emits a different WebSocket event to all connected clients. This events notifies the client(s) that data has been recevied and forwards that data along to them. The client(s) then inject that data into the html. The relative percentages of positive and negative tweets are displayed in a donut chart created using the [ChartJS](https://www.chartjs.org/docs/latest/charts/doughnut.html) npm package.

Thank you for taking the time to demo this project. I hope you enjoy *SentimentAnalyzer!*
