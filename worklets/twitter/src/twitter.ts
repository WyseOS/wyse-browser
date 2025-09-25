import * as fs from "fs";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { Session } from "../../../browser/src/session";
import { Page } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { listenNetworkRequests } from "./helpers/listen-network-requests";
import { TWITTER_SEARCH_ADVANCED_URL, TWITTER_SEND_TWEET_URL } from "./constants";
import { logErrorMsg } from "./utils/log";
import { ops_search } from "./operations/ops_search";
import { ops_tweet } from "./operations/ops_tweet";
import { ops_like } from "./operations/ops_like";
import { ops_retweet } from "./operations/ops_retweet";
import { IWorklet } from "../../../browser/src/interfaces/iworklet";
import { ops_login } from "./operations/ops_login";
import { ops_input_otp } from "./operations/ops_input_otp";
import { fetch_help_document } from "./operations/ops_help";
import { FOLDER_DESTINATION } from "./constants";
export class Twitter implements IWorklet {
  private accessToken: string;
  private searchKeyword: string;
  private targetTweetCount: number;
  private searchTab: string;
  private tweetsNotFoundOnCurrentTab: boolean;
  private manifest: any;
  private session: Session;
  private properties: Map<string, string | number> = new Map();

  async initialize(session: Session, properties: Map<string, string | number>) {
    const resolvePath = path.resolve('../', 'configs/worklets/twitter', "manifest.json");
    this.manifest = JSON.parse(fs.readFileSync(resolvePath, "utf8"));
    this.session = session;
    this.properties = properties;
    chromium.use(stealth());
    console.log(`Worklet ${this.manifest.name} initialized`);
  }

  getName(): string {
    return this.manifest.name;
  }

  getVersion(): string {
    return this.manifest.version;
  }

  async execute(actionName: string, ...args: any[]): Promise<string> {
    if (actionName !== "action_login" && actionName !== "action_input_otp") {
      this.accessToken = this.properties.get("TwitterAuthToken") as string;
      if (!this.accessToken || this.accessToken === "") {
        throw new Error(`Action ${actionName} requires TwitterAuthToken parameter, but it was not found or is empty`);
      }

      this.session.browserContext.addCookies([
        {
          name: "auth_token",
          value: this.accessToken,
          domain: "x.com",
          path: "/",
          expires: -1,
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
        },
      ]);
    }
    const params = args.map(([_, value]) => value);

    const page = this.session.page;
    let result = "";
    switch (actionName) {
      case 'action_login':
        if (params.length !== 2 ||
          typeof params[0] !== 'string' ||
          typeof params[1] !== 'string') {
          throw new Error('action_login requires (username: string, password: string, account_name: string)');
        }
        result = await this.action_login(params[0], params[1], params[2], page);
        break;
      case 'action_input_otp':
        if (params.length !== 1 ||
          typeof params[0] !== 'string') {
          throw new Error('action_login requires (otp: string)');
        }
        result = await this.action_input_otp(params[0], page);
        break;
      case 'action_search':
        if (params.length !== 2 ||
          typeof params[0] !== 'string' ||
          typeof params[1] !== 'number') {
          throw new Error('action_search requires (searchKeyword: string, targetTweetCount: number)');
        }
        result = await this.action_search(params[0], params[1], page);
        break;
      case 'action_send_tweet':
        if (params.length !== 1 ||
          typeof params[0] !== 'string') {
          throw new Error('action_send_tweet requires (tweet: string)');
        }
        result = await this.actionSendTweet(params[0], page);
        break;
      case 'action_like':
        if (params.length !== 1 ||
          typeof params[0] !== 'string') {
          throw new Error('action_like requires (url: string)');
        }
        result = await this.actionLike(params[0], page);
        break;
      case 'action_retweet':
        if (params.length !== 1 ||
          typeof params[0] !== 'string') {
          throw new Error('action_retweet requires (url: string)');
        }
        result = await this.actionRetweet(params[0], page);
        break;
      case 'action_get_help_document':
        return this.action_get_help_document(page);
      default:
        throw new Error(`Unknown action: ${actionName}`);
    }

    return result;
  }

  async action_get_help_document(page: Page): Promise<string> {
    console.log("Fetch Help Document start");
    let err = await fetch_help_document(page, FOLDER_DESTINATION);
    if (err !== "") {
      console.log("Fetch Help Document error: " + err);
      return err;
    }

    console.log("Fetch Help Document done!");
    return "";
  }

  dispose(): void {
    console.log(`Worklet ${this.manifest.name} disposed`);
  }

  async action_login(username: string, password: string, accountname: string, page: Page): Promise<string> {
    console.info(`Twitter login username: ${username}`);
    let msg = await ops_login(page, username, password, accountname);
    console.log(`Twitter login username: ${username} done`);
    return msg;
  }

  async action_input_otp(otp: string, page: Page): Promise<string> {
    console.info(`Twitter login otp: ${otp}`);
    let msg = await ops_input_otp(page, otp);
    console.log(`Twitter login otp: ${otp} done`);
    return msg;
  }

  async action_search(searchKeyword: string, targetTweetCount: number, page: Page): Promise<string> {
    this.searchKeyword = searchKeyword;
    this.targetTweetCount = targetTweetCount;
    this.searchTab = "TOP";
    this.tweetsNotFoundOnCurrentTab = false;
    const outputDir = `./output`;
    const outputPath = `${outputDir}/${uuidv4()}.json`;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.info("Opening twitter search page");
    listenNetworkRequests(page);

    try {
      let url = TWITTER_SEARCH_ADVANCED_URL[this.searchTab];
      await ops_search(url, this.searchKeyword, this.targetTweetCount, outputPath, page);

      if (this.tweetsNotFoundOnCurrentTab) {
        console.info(`No tweets found on ${this.searchTab} tab, trying another tab...`);

        url = TWITTER_SEARCH_ADVANCED_URL["LATEST"];
        await ops_search(url, this.searchKeyword, this.targetTweetCount, outputPath, page);
      }
    } catch (error) {
      logErrorMsg(error);
      console.info(`Keywords: ${this.searchKeyword}`);
    }

    console.log("Done!");
    return outputPath;
  }

  async actionSendTweet(tweet: string, page: Page): Promise<string> {
    console.info("Opening send tweet page");

    let url = await ops_tweet(TWITTER_SEND_TWEET_URL, tweet, page);
    if (url === "") {
      console.log("Tweet already sent: ", tweet);
    }
    else {
      console.log("Sent tweet: ", tweet, ", status url is:", url);
    }
    return url;
  }

  async actionLike(url: string, page: Page): Promise<string> {
    console.info("Opening like tweet page");
    const result = await ops_like(url, page);

    console.log("Liked tweet: ", url, ", isSuccess: ", result);
    if (result) {
      return "success";
    }
    else {
      return "failed";
    }
  }

  async actionRetweet(url: string, page: Page): Promise<string> {
    console.info("Opening retweet tweet page");
    const result = await ops_retweet(url, page);

    console.log("Retweeted tweet: ", url, ", isSuccess: ", result);
    if (result) {
      return "success";
    }
    else {
      return "failed";
    }
  }
}
