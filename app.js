// set up

var port = process.env.PORT;
var botName = process.env.TWITTER_SCREEN_NAME;

var express = require('express');
var app = express();
var mongoose = require('mongoose');
var morgan = require('morgan');
var _ = require('underscore');
var dbConnection = require('./database/databasemanager');
var User = require('./database/user');
var Twitter = require('twitter');

// add morgan for logging
app.use(morgan('dev'));

//On successful connect
dbConnection.on('connected', function() {

    // serve the routes
    app.get('*', function(req, res) {
        res.sendStatus(200);
    });


    setTimeout(function() {
        process.exit();
    }, (60000 * 30));


    var client = new Twitter({
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: process.env.ACCESS_TOKEN_KEY,
        access_token_secret: process.env.ACCESS_TOKEN_SECRET,
    });

    /**
     * Stream statuses filtered by keyword
     * number of tweets per second depends on topic popularity
     **/
    client.stream('user', {
        with: 'user',
        replies: 'all'
    }, function(stream) {
        stream.on('data', function(tweet) {

			// only reply to messages that you're sent...
			if(tweet.in_reply_to_screen_name == botName) {

				var userID = tweet.user.id;

				User.findOne({ 'twitter.id' : userID }, function(err, user) {

	                if (err) console.error(err);

	                // if the user is found then log them in
	                else if (!user) {

						client.post('/statuses/update', {
							in_reply_to_status_id: tweet.id_str,
							status: "@" + tweet.user.screen_name + " 👋👋👋 Hey, looks like you're not a user just yet! Signup at https://checkyourfollowers.com and then resend this message."
						}, function(err, resp) {

						});

					} else {

						// if the request looks good - say ok
						var tweetText = tweet.text;
						var indexOfKeyPhrase = tweetText.indexOf(' check ');


						if(indexOfKeyPhrase == 15 && tweetText.substring(22) != '') {

							var postPhrase = tweetText.substring(22);

							if(postPhrase.indexOf(' ') > 0)
								postPhrase = postPhrase.substring(postPhrase.indexOf(' '));

							if(postPhrase.indexOf('@') == 0)
								postPhrase = postPhrase.substring(1);


							user.requests.push({
								requestTime: Date.now(),
								request: postPhrase,
								tweetID: tweet.id_str,
							});

							user.save(function(err, user) {
								if(err) console.error(err);
							});


						} else {

							// formatting issue...
							client.post('/statuses/update', {
								in_reply_to_status_id: tweet.id_str,
								status: "@" + tweet.user.screen_name + " oops,  not sure what you meant. Can you try again?"
							}, function(err, response) {
								console.log(err);
							});

						}

					}

				});


			}


        });

        stream.on('error', function(error) {
            console.log('Stream error: ');
            console.log(error);

            process.exit();

        });


    });


    // create the servers
    app.listen(port);
    console.log('Server started...');

});
