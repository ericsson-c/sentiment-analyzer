from classifier import classifier, prepare_tweet
from pymongo import MongoClient
import sys
from flask import Flask
from flask import render_template
import tweepy

'''
classifier = classifier()

app = Flask(__name__, template_folder="/Users/ericssoncolborn/Documents/Projects/realtime-tweets/python/templates")
app.config['EXPLAIN_TEMPLATE_LOADING'] = True

consumer = KafkaConsumer("test",
        bootstrap_servers="localhost:9092",
        group_id=None,
        enable_auto_commit=False,
        auto_offset_reset="latest",
        session_timeout_ms=10000)

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/start")
def start():

    client.filter()
    consumer.seek_to_end()

    for tweet in consumer:
        consumer.commit()
        print(tweet.value.decode('utf-8'))

    # return render_template("index.html")

@app.route("/end")
def end():

    client.disconnect()
    consumer.close()


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


def startStream():
    return True


for tweet in consumer:

    text = tweet.value.decode('utf-8')
    print(text)
    sentiment = classifier.classify(prepare_tweet(text))

    insert_tweet({
        'text': text,
        'sentiment': sentiment
    }, 'tweets')

consumer.close()

'''

# test tweets are in!