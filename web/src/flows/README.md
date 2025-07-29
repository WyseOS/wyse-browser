# Wyse Flows

## Base Definition

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
| CoinGecko | coingecko_all_categories | Query all the coins categories with market data (market cap, volume, etc.) on CoinGecko which are sorted by the market cap. | [coingecko_all_categories](./coingecko_all_categories/manifest.json) |
| CoinGecko | coingecko_search_token | Search for a token by name | [coingecko_search_token](./coingecko_search_token/manifest.json) |
| CoinGecko | coingecko_top_coins | Query top N coins ordered by Market Cap. pageNumber starts from 1, default: 1. pageLimit is the number of coins per page, default: 100. | [coingecko_top_coins](./coingecko_top_coins/manifest.json) |
| CoinGecko | coingecko_trending_tokens | Query trending search coins, nfts and categories on CoinGecko in the last 24 hours. | [coingecko_trending_tokens](./coingecko_trending_tokens/manifest.json) |
| CoinGecko | coingecko_trusted_tokens_by_network | Get all trusted tokens by network. Supported networks are: all, ethereum, optimism, polygon, base, arbitrum, gnosis and zksync. | [coingecko_trusted_tokens_by_network](./coingecko_trusted_tokens_by_network/manifest.json) |
| Twitter | twitter_like_retweet | Like and retweet a tweet on Twitter with twitter_auth_token. | [twitter_like_retweet](./twitter_like_retweet/manifest.json) |
| Twitter | twitter_search_save_csv | Search tweets from Twitter with twitter_auth_token and save results to a csv file. | [twitter_search_save_csv](./twitter_search_save_csv/manifest.json) |
| Twitter | twitter_send_tweet | Send a tweet to Twitter with twitter_auth_token. | [twitter_send_tweet](./twitter_send_tweet/manifest.json) |
| WalletConnect | wallet_connect_qr_check_owlto | Connect to a wallet and check if the qr code is scanned. It is specific for WalletConnect on Owlto Finance. | [wallet_connect_qr_check_owlto](./wallet_connect_qr_check_owlto/manifest.json) |
| WalletConnect | wallet_connect_qr_check_uniswap | Connect to a wallet and check if the qr code is scanned. It is specific for WalletConnect on Uniswap. | [wallet_connect_qr_check_uniswap](./wallet_connect_qr_check_uniswap/manifest.json) |
| WalletConnect | wallet_connect_qr_owlto | Connect to a wallet and show the qr code. It is specific for WalletConnect on Owlto Finance. | [wallet_connect_qr_owlto](./wallet_connect_qr_owlto/manifest.json) |
| WalletConnect | wallet_connect_qr_uniswap | Connect to a wallet and scan the qr code. It is specific for WalletConnect on Uniswap. | [wallet_connect_qr_uniswap](./wallet_connect_qr_uniswap/manifest.json) |