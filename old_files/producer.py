import json
from kafka import KafkaProducer, KafkaConsumer
import tweepy

consumer = KafkaConsumer("raw",
        bootstrap_servers="localhost:9092",
        group_id=None,
        enable_auto_commit=True,
        auto_offset_reset="latest",
        session_timeout_ms=10000)

producer = KafkaProducer(bootstrap_servers="localhost:9092")

class BasicStream(tweepy.StreamingClient):

    def __init__(self, bearerToken):
        super().__init__(bearer_token=bearerToken)
        self.counter = 0
        self.limit = 3
        # self.producer = producer

    def on_status(self, status):
        print(status)

    def on_data(self, data):
        # limit stream count to the first few tweets
        if self.counter < self.limit:
            json_ = json.loads(data)
            tweet_text = json_["data"]["text"].encode('utf-8')
            #print(tweet_text)
            producer.send("test", tweet_text)
        else:
            return True

    def on_error(self, status_code):
        # 420 = rate limit, ignore all other errors
        if status_code == 420:
            return False


# client.filter()

