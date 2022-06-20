from nltk.corpus import twitter_samples
from nltk.tag import pos_tag
from nltk.stem.wordnet import WordNetLemmatizer
from nltk import NaiveBayesClassifier
import re, string
from nltk.corpus import stopwords
import random
from nltk.tokenize import word_tokenize

# removing noise using regex

def remove_noise(tweet_tokens, stop_words=stopwords.words('english')):

    cleaned_tokens = []

    for token, tag in pos_tag(tweet_tokens):

        #original_re = 'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+#]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+'
        my_re = 'http[s]?:\/\/(\S|(%[0-9a-fA-F][0-9a-fA-F]))+'

        token = re.sub(my_re, "", token)
        token = re.sub("(@[A-Za-z_]+)", "", token)
    
        if tag.startswith('NN'):
            pos = 'n'
        elif tag.startswith('VB'):
            pos = 'v'
        else:
            pos = 'a'

        lemmatizer = WordNetLemmatizer()
        token = lemmatizer.lemmatize(token, pos)

        if len(token) > 0 and token not in string.punctuation and token.lower() not in stop_words:
            cleaned_tokens.append(token.lower())

    return cleaned_tokens

'''
def get_all_words(cleaned_tokens_list):
    for tokens in cleaned_tokens_list:
        for token in tokens:
            yield token
'''


def get_tweets_for_model(cleaned_tokens_list):
    for tweet_tokens in cleaned_tokens_list:
        yield dict([token, True] for token in tweet_tokens)

# input: list of tweet texts
# - tokenizes tweets
# - removes noise
# - casts each token into a dict {token: True} to prepare it for the model
# - 
def classifier():

    positive_tweets = twitter_samples.tokenized("positive_tweets.json")
    negative_tweets = twitter_samples.tokenized("negative_tweets.json")

    positive_cleaned_tokens_list = []
    negative_cleaned_tokens_list = []

    for tokens in positive_tweets:
        positive_cleaned_tokens_list.append(remove_noise(tokens))

    for tokens in negative_tweets:
        negative_cleaned_tokens_list.append(remove_noise(tokens))

    '''
    all_pos = get_all_words(positive_cleaned_tokens_list)
    all_neg = get_all_words(negative_cleaned_tokens_list)

    #req_dist_pos = FreqDist(all_pos)
    freq_dist_neg = FreqDist(all_neg)
    '''

    pos_tokens_model = get_tweets_for_model(positive_cleaned_tokens_list)
    neg_tokens_model = get_tweets_for_model(negative_cleaned_tokens_list)

    # splitting into training and testing sets

    pos_dataset = [(tweet_dict, "Positive") for tweet_dict in pos_tokens_model]
    neg_dataset = [(tweet_dict, "Negative") for tweet_dict in neg_tokens_model]

    dataset = pos_dataset + neg_dataset

    random.shuffle(dataset)

    train_data = dataset[:7000]

    # building and training a model

    classifier = NaiveBayesClassifier.train(train_data)

    return classifier

def prepare_tweet(tweet):
    tokens = word_tokenize(tweet)
    clean_tokens = remove_noise(tokens)
    return dict([token, True] for token in clean_tokens)


# testing stuff
if __name__ == '__main__':

    classifier = classifier()
    tweet = "Fuck that stupid piece of shit company, never using them again."
    print(classifier.classify(prepare_tweet(tweet)))