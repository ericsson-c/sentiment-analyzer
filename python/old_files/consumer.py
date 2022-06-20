'''
1) get tweets from KafkaConsumer
2) parse out text
3) feed text to classifier, store results
    - just store count of pos and neg
    - keep track of total # of tweets to find %

4) store results in mongo
'''

from gc import collect
from classifier import classifier, prepare_tweet
from kafka import KafkaConsumer
import json
from pymongo import MongoClient
import sys
from flask import Flask
from flask import render_template

classifier = classifier()

consumer = KafkaConsumer('test',
                        bootstrap_servers="localhost:9092",
                        auto_offset_reset='earliest',
                        group_id=None)

# initialize simple flask app
app = Flask(__name__, template_folder="/Users/ericssoncolborn/Documents/Projects/realtime-tweets/python/project/templates")
app.config['EXPLAIN_TEMPLATE_LOADING'] = True

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="localhost", port=5001, debug=True)


# initialize mongo client
MONGO_URI = 'mongodb+srv://Ericsson:password1234@tweetDB.hpzhk.mongodb.net/?retryWrites=true&w=majority'

try:
    client = MongoClient(MONGO_URI)
    db = client['test']
except:
    print("error connecting to mongo")
    sys.exit()
    

def insert_tweet(tweet, collection="test"):
    try:
        db[collection].insert_one(tweet)
    except Exception as e:
        print('error occured while inserting tweet: \n> ', e, '\n\n')


# kafka consumer -> classifier -> mongodb


for tweet in consumer:

    text = tweet.value.decode('utf-8')
    print(text)
    sentiment = classifier.classify(prepare_tweet(text))

    insert_tweet({
        'text': text,
        'sentiment': sentiment
    }, 'tweets')

consumer.close()

# test tweets are in!