import fs from "fs";
import { pick } from "lodash";
import { inputKeywords } from "../helpers/input-keywords";
import { scrollUp, scrollDown } from "../helpers/page.helper";
import { Entry } from "../types/tweets.types";
import { FILTERED_FIELDS, SEARCH_REACH_TIMEOUT_MAX, SEARCH_TIMEOUT_LIMIT } from "../constants";
import { CACHE_KEYS, cache } from "../utils/cache";
import { logErrorMsg } from "../utils/log";
import { calculateForRateLimit } from "../helpers/exponential-backoff";

export const ops_search = async (twitterSearchUrl: string, searchKeyword: string, targetTweetCount: number, fileFullPath: string, page): Promise<void> => {
    await page.goto(twitterSearchUrl);

    // check is current page url is twitter login page (have /login in the url)
    const isLoggedIn = !page.url().includes("/login");

    if (!isLoggedIn) {
        logErrorMsg("Invalid twitter auth token. Please check your auth token");
    }

    inputKeywords(page, searchKeyword, searchKeyword);

    let timeoutCount = 0;
    let additionalTweetsCount = 0;
    let reachTimeout = 0;
    // count how many rate limit exception got raised
    let rateLimitCount = 0;

    const allData = {
        tweets: [],
    };

    async function scrollAndSave(targetTweetCount: number) {
        while (allData.tweets.length < targetTweetCount && (timeoutCount < SEARCH_TIMEOUT_LIMIT || reachTimeout < SEARCH_REACH_TIMEOUT_MAX)) {
            if (timeoutCount > SEARCH_TIMEOUT_LIMIT && reachTimeout < SEARCH_REACH_TIMEOUT_MAX) {
                reachTimeout++;
                console.info(`Timeout reached ${reachTimeout} times, making sure again...`);
                timeoutCount = 0;

                await scrollUp(page);
                await page.waitForTimeout(2000);
                await scrollDown(page);
            }

            // Wait for the next response or 3 seconds, whichever comes first
            const response = await Promise.race([
                page.waitForResponse(
                    (response) => response.url().includes("SearchTimeline") || response.url().includes("TweetDetail")
                ),
                page.waitForTimeout(1500),
            ]);

            if (response) {
                timeoutCount = 0;

                let tweets: Entry[] = [];

                let responseJson;

                try {
                    responseJson = await response.json();
                } catch (error) {
                    cache.set(CACHE_KEYS.GOT_TWEETS, false);

                    if ((await response.text()).toLowerCase().includes("rate limit")) {
                        logErrorMsg(`Error parsing response json: ${JSON.stringify(response)}`);
                        logErrorMsg(
                            `Most likely, you have already exceeded the Twitter rate limit. Read more on https://x.com/elonmusk/status/1675187969420828672.`
                        );

                        // wait for rate limit window passed before retrying
                        await page.waitForTimeout(calculateForRateLimit(rateLimitCount++));

                        // click retry
                        await page.click("text=Retry");
                        return await scrollAndSave(targetTweetCount); // recursive call
                    }

                    break;
                }

                // reset the rate limit exception count
                rateLimitCount = 0;

                const isTweetDetail = responseJson.data.threaded_conversation_with_injections_v2;
                if (isTweetDetail) {
                    tweets = responseJson.data?.threaded_conversation_with_injections_v2.instructions[0].entries;
                } else {
                    tweets = responseJson.data?.search_by_raw_query.search_timeline.timeline?.instructions?.[0]?.entries;
                }

                if (!tweets) {
                    logErrorMsg("No more tweets found, please check your search criteria");
                    return;
                }

                if (!tweets.length) {
                    // found text "not found" on the page
                    if (await page.getByText("No results for").count()) {
                        this.tweetsNotFoundOnCurrentTab = true;
                        console.info("No tweets found for the search criteria");
                        break;
                    }
                }

                cache.set(CACHE_KEYS.GOT_TWEETS, true);

                const tweetContents = tweets
                    .map((tweet) => {
                        const isPromotedTweet = tweet.entryId.includes("promoted");

                        if (!tweet?.content?.itemContent?.tweet_results?.result) return null;

                        if (isPromotedTweet) return null;

                        const result = tweet.content.itemContent.tweet_results.result


                        if (!result.tweet?.core?.user_results && !result.core?.user_results) return null;

                        const tweetContent = result.legacy || result.tweet.legacy;
                        const userContent =
                            result.core?.user_results?.result?.legacy || result.tweet.core.user_results.result.legacy;

                        return {
                            tweet: tweetContent,
                            user: userContent,
                        };
                    })
                    .filter((tweet) => tweet !== null);

                // add tweets and users to allData
                allData.tweets.push(...tweetContents);

                // write tweets to file
                const comingTweets = tweetContents;

                const rows = comingTweets.map((current: (typeof tweetContents)[0]) => {
                    const tweet = pick(current.tweet, FILTERED_FIELDS);

                    const charsToReplace = ["\n", ",", '"', "[U+2066]", "[U+2069]", "’", "‘", "“", "”", "…", "—", "–", "•"];
                    let cleanTweetText = tweet.full_text.replace(new RegExp(charsToReplace.join("|"), "g"), " ");

                    // replace all emojis
                    // Emoji regex pattern
                    const emojiPattern =
                        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

                    // Replace all instances of emojis in the string
                    cleanTweetText = cleanTweetText.replace(emojiPattern, "");

                    // replace all double spaces with single space
                    cleanTweetText = cleanTweetText.replace(/\s\s+/g, " ");

                    tweet["full_text"] = cleanTweetText;
                    tweet["username"] = current.user.screen_name;
                    tweet["tweet_url"] = `https://x.com/${current.user.screen_name}/status/${tweet.id_str}`;
                    tweet["image_url"] = current.tweet.entities?.media?.[0]?.media_url_https || "";
                    tweet["location"] = current.user.location || "";
                    tweet["in_reply_to_screen_name"] = current.tweet.in_reply_to_screen_name || "";

                    return tweet;
                });

                //export to json
                fs.writeFileSync(fileFullPath, JSON.stringify(rows, null, 2));
                console.info(`\nYour tweets saved to: ${fileFullPath}`);

                // progress:
                console.info(`Total tweets saved: ${allData.tweets.length}`);
                additionalTweetsCount += comingTweets.length;

                // for every multiple of 100, wait for 5 seconds
                if (additionalTweetsCount > 100) {
                    additionalTweetsCount = 0;
                }

                cache.set(CACHE_KEYS.GOT_TWEETS, false);
            } else {
                if (cache.get(CACHE_KEYS.GOT_TWEETS) === false) {
                    timeoutCount++;

                    if (timeoutCount === 1) {
                        process.stdout.write(`-- Scrolling... (${timeoutCount})`);
                    } else {
                        process.stdout.write(` (${timeoutCount})`);
                    }

                    if (timeoutCount > SEARCH_TIMEOUT_LIMIT) {
                        console.info("No more tweets found, please check your search criteria");
                        break;
                    }
                }

                await scrollDown(page);
                await scrollAndSave(targetTweetCount); // call the function again to resume scrolling
            }

            await scrollDown(page);
        }
    }

    /**
     * Initial scroll and save tweets then it will do recursive call
     */
    await scrollAndSave(targetTweetCount);

    if (allData.tweets.length) {
        console.info(`Got ${allData.tweets.length} tweets, done scrolling...`);
    } else {
        console.info("No tweets found for the search criteria");
    }
}