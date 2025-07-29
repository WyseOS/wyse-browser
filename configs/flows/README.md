# Wyse Flows

## Definition

```JSON
{
    "name": "",
    "type": "flow",
    "description": "",
    "version": "0.1.0",
    "webpage_url": "",
    "nodes": [
        {
            "name": "FlowStart",
            "type": "worklet",
            "version": "0.1.0"
        },
        {
            "name": "",
            "type": "worklet",
            "version": "0.1.0",
            "properties": {}
        },
        {
            "name": "FlowEnd",
            "type": "worklet",
            "version": "0.1.0"
        }
    ],
    "connections": [
        {
            "name": "start the flow, send a tweet",
            "src": {
                "worklet": "FlowStart",
                "action": ""
            },
            "dest": [
                {
                    "worklet": "Twitter",
                    "action": ""
                }
            ]
        },
        {
            "name": "flow ends",
            "src": {
                "worklet": "",
                "action": ""
            },
            "dest": [
                {
                    "worklet": "FlowEnd",
                    "action": "action_flow_end"
                }
            ]
        }
    ],
    "properties": {},
    "parameters": []
}
```

| Category | Name | Description | Manifest |
|----------|------|-------------|-----------|
| Twitter | twitter_like_retweet | Like and retweet a tweet on Twitter with twitter_auth_token. | [twitter_like_retweet](./twitter_like_retweet/manifest.json) |
| Twitter | twitter_search_save_csv | Search tweets from Twitter with twitter_auth_token and save results to a csv file. | [twitter_search_save_csv](./twitter_search_save_csv/manifest.json) |
| Twitter | twitter_send_tweet | Send a tweet to Twitter with twitter_auth_token. | [twitter_send_tweet](./twitter_send_tweet/manifest.json) |
