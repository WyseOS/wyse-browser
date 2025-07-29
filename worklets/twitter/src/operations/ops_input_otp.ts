import { Page } from "playwright";

export const ops_input_otp = async (page: Page, otp: string): Promise<string> => {
    // 点击enter code输入框
    await page.waitForSelector(`input[data-testid="ocfEnterTextTextInput"]`);
    await page.waitForTimeout(500);
    await page.click(`input[data-testid="ocfEnterTextTextInput"]`);
    await page.waitForTimeout(1500);

    // 输入otp
    await page.fill(`input[data-testid="ocfEnterTextTextInput"]`, otp);
    await page.waitForTimeout(1500);

    // 点击Next
    await page.waitForSelector(`button[data-testid="ocfEnterTextNextButton"] span:text('Next')`);
    await page.waitForTimeout(500);
    await page.click(`button[data-testid="ocfEnterTextNextButton"] span:text('Next')`);
    await page.waitForTimeout(2000);

    for (let i = 0; i < 30; i++) {
        const homeElement = await page.$(`button[data-testid="SideNav_AccountSwitcher_Button"]`);
        if (homeElement) {
            return "";
        }

        await page.waitForTimeout(1000);
    }

    return "login fail";
}
