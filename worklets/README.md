# Wyse Worklets

A worklet is a reusable, autonomous, and highly composable code block that performs a specific task. It exposes resources and tools, operates independently with focused responsibilities. Actions are the code blocks that are executed by Worklets.

## FlowStart

The `FlowStart` worklet is a utility worklet used to signify the beginning of a flow execution.

### Actions

-   `action_flow_start`: Initiates a flow.

## FlowEnd

The `FlowEnd` worklet is a utility worklet used to signify the termination of a flow execution.

### Actions

-   `action_flow_end`: Concludes a flow.

## IOUtil

The `IOUtil` worklet provides functionalities for handling input/output operations, primarily focusing on data transformation between JSON and CSV formats.

### Actions

-   `action_json2csv(fileFullPath: string)`: Reads a JSON file from the given path and converts its content into a CSV format. The resulting CSV is saved in the `./output` directory.
-   `action_append_csv(fileFullPath: string, fileName: string, inJsonData: Record<string, any>[])`: Appends JSON data to an existing CSV file or creates a new one if it doesn't exist. This action is primarily used internally by `action_json2csv`.

## Twitter

The `Twitter` worklet provides a set of actions to interact with the Twitter platform, enabling operations such as searching for tweets, sending new tweets, liking, and retweeting.

### Actions

-   `action_login(username: string, password: string, accountName: string)`: Performs a login operation on Twitter using the provided credentials. Returns a message indicating success or if a verification code is needed.
-   `action_input_otp(otp: string)`: Inputs a two-factor authentication (OTP) code during the login process.
-   `action_search(searchKeyword: string, targetTweetCount: number)`: Scrapes tweets from Twitter based on a `searchKeyword` and a `targetTweetCount`. The scraped tweets are saved as a JSON file in the `./output` folder within the `twitter` worklet directory.
-   `action_send_tweet(tweet: string)`: Publishes a new tweet with the provided `tweet` content. Returns the URL of the sent tweet if successful.
-   `action_like(url: string)`: Likes the tweet at the specified `url`.
-   `action_retweet(url: string)`: Retweets the tweet at the specified `url`.

**Note:** To use the Twitter worklet for actions other than login or OTP input, a valid `auth_token` cookie must be provided as `TwitterAuthToken` in the worklet's properties. This token can be obtained by logging into Twitter in a browser and extracting the `auth_token` cookie.
