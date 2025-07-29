import { Page } from "playwright";
import { logErrorMsg } from "../utils/log";
import { scrollDown } from "../helpers/page.helper";

export const ops_like = async (url: string, page: Page): Promise<boolean> => {
    await page.goto(url);

    // check is current page url is twitter login page (have /login in the url)
    const isLoggedIn = !page.url().includes("/login");

    if (!isLoggedIn) {
        logErrorMsg("Invalid twitter auth token. Please check your auth token");
    }

    let foundLikeButton = false;
    let maxPageScroll = 0;
    while (!foundLikeButton && maxPageScroll < 5) {
        const element = await page.waitForSelector('button[data-testid="like"]', { state: "visible" });

        if (element) {
            foundLikeButton = true;
            await element.click();
            await page.waitForTimeout(1000);
        }
        else {
            await scrollDown(page);
            await page.waitForTimeout(2000);

            maxPageScroll++;
        }
    }

    return foundLikeButton;
}
