import { Page } from "playwright";

export const ops_login = async (page: Page, username: string, password: string, account_name: string): Promise<string> => {
    await page.goto("https://x.com/i/flow/login?lang=en");

    // Wait for username input and fill
    const usernameInput = page.locator(`input[autocomplete="username"]`);
    await usernameInput.waitFor({ state: 'visible' });
    await usernameInput.click();
    await usernameInput.fill(username);

    // Click Next
    const nextButton = page.locator(`button span:text('Next')`).first();
    await nextButton.waitFor({ state: 'visible' });
    await nextButton.click();

    // Check for 'Phone or username' verification step using data-testid
    const phoneOrUsernameInput = page.locator('input[data-testid="ocfEnterTextTextInput"]');
    if (await phoneOrUsernameInput.isVisible()) {
        if (!account_name) {
            return "Account name is required for verification step.";
        }
        await phoneOrUsernameInput.fill(account_name);
        const verifyNextButton = page.locator('button[data-testid="ocfEnterTextNextButton"]');
        await verifyNextButton.waitFor({ state: 'visible', timeout: 3000 });
        await verifyNextButton.click();
    }

    const passwordInput = page.locator(`input[type="password"]`);
    await passwordInput.waitFor({ state: 'visible' });
    await passwordInput.click();
    await passwordInput.fill(password);

    // Click Log in
    const loginButton = page.locator(`button span:text('Log in')`).first();
    await loginButton.waitFor({ state: 'visible' });
    await loginButton.click();

    // Check for verification code prompt
    const verificationCodePrompt = page.locator(`h1 span:text('Enter your verification code')`);
    try {
        await verificationCodePrompt.waitFor({ state: 'visible', timeout: 3000 });
        return "Please input your verification code (Use your code generator app to generate a code and enter it below)";
    } catch (error) {
        return "";
    }
};
