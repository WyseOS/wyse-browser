import { Page } from "playwright";
import { logErrorMsg } from "../utils/log";

export const ops_tweet = async (url: string, tweet: string, page: Page): Promise<string> => {
    await page.goto(url);

    // check is current page url is twitter login page (have /login in the url)
    const isLoggedIn = !page.url().includes("/login");

    if (!isLoggedIn) {
        logErrorMsg("Invalid twitter auth token. Please check your auth token");
    }

    await page.waitForSelector('data-testid=tweetTextarea_0', {
        state: "visible",
    });

    await page.click('data-testid=tweetTextarea_0');
    await page.fill('data-testid=tweetTextarea_0', tweet);

    await page.waitForTimeout(1500);
    await page.click('data-testid=tweetButton');
    await page.waitForTimeout(1500);

    const alreadySaid = await page.getByRole('status').getByText('Whoops! You already said that.', { exact: true }).isVisible();
    if (!alreadySaid) {
        await page.getByText('View', { exact: true }).click();
        await page.waitForTimeout(1500);
        return page.url();
    }

    return "";
}
