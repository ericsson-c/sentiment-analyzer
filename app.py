# from flask import Flask
# from flask import render_template
from kafka import KafkaConsumer
from kafka import KafkaProducer
from classifier import classifier, prepare_tweet
import json
from bson import json_util

'''
* ML Pipiline *

 - Kafka Consumer pulls data from kafka topic that stores twitter data
 - Bayes classifier classifies the tweet as positive or negative sentiment
 - Kafka Producer sends the classification to a second kafka topic
 - Node.js web app pulls classifications from the second topic and displays them
    as a donut graph
'''

# Kafka setup

consumer = KafkaConsumer("raw",
        bootstrap_servers="localhost:9092",
        group_id=None,
        enable_auto_commit=True,
        # auto_offset_reset="latest",
        session_timeout_ms=10000)

producer = KafkaProducer(bootstrap_servers="localhost:9092", acks=0)

# Bayes classifier defined in classifier.py
sentimentClassifier = classifier()

for tweet in consumer:
        text = tweet.value.decode('utf-8')

        data = {
                'sentiment': sentimentClassifier.classify(prepare_tweet(text)),
                'text': text
        }

        print(data)
        producer.send("processed", json.dumps(data, default=json_util.default).encode('utf-8'))


consumer.close()