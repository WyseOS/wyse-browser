import { Page } from "playwright";
import { logErrorMsg } from "../utils/log";
import { scrollDown } from "../helpers/page.helper";

export const ops_retweet = async (url: string, page: Page): Promise<boolean> => {
    await page.goto(url);

    const isLoggedIn = !page.url().includes("/login");
    if (!isLoggedIn) {
        logErrorMsg("Invalid twitter auth token. Please check your auth token");
    }

    let foundButton = false;
    let maxPageScroll = 0;
    while (!foundButton && maxPageScroll < 5) {
        const element = await page.waitForSelector('button[data-testid="retweet"]', { state: "visible" });

        if (element) {
            foundButton = true;
            await element.click();
            await page.waitForTimeout(1500);
            await page.getByText('Repost', { exact: true }).click();
        }
        else {
            await scrollDown(page);
            await page.waitForTimeout(2000);

            maxPageScroll++;
        }
    }

    return foundButton;
}