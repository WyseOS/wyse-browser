import { Page } from "playwright";

export const inputKeywords = async (page: Page, searchKeyword: string, modifiedSearchKeyword: string
) => {
  // wait until it shown: input[name="allOfTheseWords"]
  await page.waitForSelector('input[name="allOfTheseWords"]', {
    state: "visible",
  });

  await page.click('input[name="allOfTheseWords"]');

  // if (SEARCH_FROM_DATE) {
  //   const [day, month, year] = SEARCH_FROM_DATE.split(" ")[0].split("-");
  //   modifiedSearchKeyword += ` since:${year}-${month}-${day}`;
  // }

  // if (SEARCH_TO_DATE) {
  //   const [day, month, year] = SEARCH_TO_DATE.split(" ")[0].split("-");
  //   modifiedSearchKeyword += ` until:${year}-${month}-${day}`;
  // }

  console.info(`Filling in keywords: ${modifiedSearchKeyword}`);

  await page.fill('input[name="allOfTheseWords"]', modifiedSearchKeyword);

  // Press Enter
  await page.press('input[name="allOfTheseWords"]', "Enter");
};
