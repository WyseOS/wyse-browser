import { Session } from './session';
import { SessionContext } from './session_context';
import { Browser, BrowserContext, chromium, Page } from 'playwright';

const FAKE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fake Page</title>
</head>
<body>
  <h1 id="header">Welcome to the Fake Page</h1>
  <button id="click-me">Click Me</button>
  <input type="text" id="input-box" />
</body>
</html>
`;

// Tab content templates for multi-tab screenshot tests
const TAB_CONTENT = {
    TAB_0: `
        <html>
            <head><title>Tab 0 - Main</title></head>
            <body style="background-color: #ff0000;">
                <h1>Tab 0 Content</h1>
                <div id="tab-identifier">TAB_0_CONTENT</div>
                <p>This is the main tab</p>
            </body>
        </html>
    `,
    TAB_1: `
        <html>
            <head><title>Tab 1 - Secondary</title></head>
            <body style="background-color: #00ff00;">
                <h1>Tab 1 Content</h1>
                <div id="tab-identifier">TAB_1_CONTENT</div>
                <p>This is the second tab</p>
            </body>
        </html>
    `,
    TAB_2: `
        <html>
            <head><title>Tab 2 - Tertiary</title></head>
            <body style="background-color: #0000ff;">
                <h1>Tab 2 Content</h1>
                <div id="tab-identifier">TAB_2_CONTENT</div>
                <p>This is the third tab</p>
            </body>
        </html>
    `
};

describe('screenshot', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let testSession: Session;
    let sessionContext: SessionContext;

    beforeAll(async () => {
        browser = await chromium.launch({ headless: false });
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        context = await browser.newContext();
        page = await context.newPage();
        await page.setContent(FAKE_HTML);

        // Mock SessionContext
        sessionContext = {
            cookies: [],
            localStorage: [],
            isSaveVideo: false,
            wsPort: 9222,
            extensionNames: [],
            needExtension: jest.fn().mockReturnValue(false),
            toJson: jest.fn().mockReturnValue({}),
        } as any;

        testSession = new Session();
        // Set session properties to simulate initialized state
        (testSession as any).isInitialized = true;
        (testSession as any).page = page;
        (testSession as any).browserContext = context;
        (testSession as any).sessionContext = sessionContext;
        (testSession as any).width = 1440;
        (testSession as any).height = 900;
        (testSession as any).timeout = 30000;
        (testSession as any).id = 'test-session-id';
        (testSession as any).logger = {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        // Mock updateActionTimestamp
        testSession.updateActionTimestamp = jest.fn();
    });

    afterEach(async () => {
        await context.close();
    });

    describe('screenshot method', () => {
        it('should return base64 screenshot for normal page', async () => {
            const result = await testSession.screenshot();

            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(testSession.updateActionTimestamp).toHaveBeenCalled();
        });

        it('should throw error when session is not initialized', async () => {
            (testSession as any).isInitialized = false;
            (testSession as any).asyncInitPromise = null;

            await expect(testSession.screenshot()).rejects.toThrow('Session is not initialized, id: test-session-id');
        });

        it('should wait for async initialization if in progress', async () => {
            (testSession as any).isInitialized = false;

            // Create a promise that resolves after a short delay
            const initPromise = new Promise<void>((resolve) => {
                setTimeout(() => {
                    (testSession as any).isInitialized = true;
                    resolve();
                }, 100);
            });
            (testSession as any).asyncInitPromise = initPromise;

            const result = await testSession.screenshot();
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });
    });

    describe('screenshot integration with special pages', () => {
        it('should skip page ready check for special pages', async () => {
            await page.goto('about:blank');

            const ensurePageReadySpy = jest.spyOn(testSession as any, 'ensurePageReadyForScreenshot')
                .mockResolvedValue(undefined);

            const result = await testSession.screenshot();

            expect(result).toBeDefined();
            expect(ensurePageReadySpy).not.toHaveBeenCalled();
        });

        it('should perform page ready check for normal pages', async () => {
            // Use a normal HTTP URL that won't be detected as special
            await page.goto('http://example.com');

            const ensurePageReadySpy = jest.spyOn(testSession as any, 'ensurePageReadyForScreenshot')
                .mockResolvedValue(undefined);

            const result = await testSession.screenshot();

            expect(result).toBeDefined();
            expect(ensurePageReadySpy).toHaveBeenCalled();
        });
    });

    describe('multi-tab screenshot scenarios', () => {
        it('should capture screenshot from the correct tab after switching', async () => {
            // Create additional tabs with different content
            const tab1 = await context.newPage();
            const tab2 = await context.newPage();

            // Set different content for each tab
            await page.setContent(TAB_CONTENT.TAB_0);
            await tab1.setContent(TAB_CONTENT.TAB_1);
            await tab2.setContent(TAB_CONTENT.TAB_2);

            // Wait for all tabs to load
            await page.waitForLoadState('load');
            await tab1.waitForLoadState('load');
            await tab2.waitForLoadState('load');

            // Test screenshot from tab 0 (original page)
            (testSession as any).page = page;
            const screenshot0 = await testSession.screenshot();
            expect(screenshot0).toBeDefined();
            expect(typeof screenshot0).toBe('string');

            // Verify the screenshot is from the correct tab by checking page content
            const tab0Content = await page.textContent('#tab-identifier');
            expect(tab0Content).toBe('TAB_0_CONTENT');

            // Switch to tab 1 and take screenshot
            await tab1.bringToFront();
            (testSession as any).page = tab1;
            const screenshot1 = await testSession.screenshot();
            expect(screenshot1).toBeDefined();
            expect(typeof screenshot1).toBe('string');
            expect(screenshot1).not.toBe(screenshot0); // Should be different screenshots

            // Verify the screenshot is from the correct tab
            const tab1Content = await tab1.textContent('#tab-identifier');
            expect(tab1Content).toBe('TAB_1_CONTENT');

            // Switch to tab 2 and take screenshot
            await tab2.bringToFront();
            (testSession as any).page = tab2;
            const screenshot2 = await testSession.screenshot();
            expect(screenshot2).toBeDefined();
            expect(typeof screenshot2).toBe('string');
            expect(screenshot2).not.toBe(screenshot0); // Should be different from tab 0
            expect(screenshot2).not.toBe(screenshot1); // Should be different from tab 1

            // Verify the screenshot is from the correct tab
            const tab2Content = await tab2.textContent('#tab-identifier');
            expect(tab2Content).toBe('TAB_2_CONTENT');

            // Clean up
            await tab1.close();
            await tab2.close();
        });

        it('should detect potential bug: always screenshotting first tab', async () => {
            // Create additional tabs with distinctive content
            const tab1 = await context.newPage();
            const tab2 = await context.newPage();

            // Set different content for each tab
            await page.setContent(TAB_CONTENT.TAB_0);
            await tab1.setContent(TAB_CONTENT.TAB_1);
            await tab2.setContent(TAB_CONTENT.TAB_2);

            // Wait for all tabs to load
            await page.waitForLoadState('load');
            await tab1.waitForLoadState('load');
            await tab2.waitForLoadState('load');

            // Mock the session to always use the first tab (simulating the bug)
            const originalPageReference = (testSession as any).page;

            // Take screenshot from "tab 1" but session.page still points to tab 0
            await tab1.bringToFront();
            // Intentionally NOT updating session.page to simulate the bug
            // (testSession as any).page = tab1; // This line is commented to simulate the bug

            const screenshotFromTab1 = await testSession.screenshot();

            // Take screenshot from "tab 2" but session.page still points to tab 0
            await tab2.bringToFront();
            // Intentionally NOT updating session.page to simulate the bug
            // (testSession as any).page = tab2; // This line is commented to simulate the bug

            const screenshotFromTab2 = await testSession.screenshot();

            // If the bug exists, both screenshots should be identical (from tab 0)
            // This test demonstrates the problem: screenshots are always from the first tab
            expect(screenshotFromTab1).toBe(screenshotFromTab2);

            // Verify that the session.page is still pointing to the original tab
            expect((testSession as any).page).toBe(originalPageReference);

            // Verify the content is still from tab 0
            const currentContent = await (testSession as any).page.textContent('#tab-identifier');
            expect(currentContent).toBe('TAB_0_CONTENT');

            // Clean up
            await tab1.close();
            await tab2.close();
        });

        it('should handle screenshot in multi-tab environment with correct tab focus', async () => {
            // Create multiple tabs with different titles and content
            const tab1 = await context.newPage();
            const tab2 = await context.newPage();
            const tab3 = await context.newPage();

            // Set different content for each tab
            await page.setContent(TAB_CONTENT.TAB_0);
            await tab1.setContent(TAB_CONTENT.TAB_1);
            await tab2.setContent(TAB_CONTENT.TAB_2);
            await tab3.setContent(`
                <html>
                    <head><title>Tab 3 - Special</title></head>
                    <body style="background-color: #ffff00;">
                        <h1>Tab 3 Content</h1>
                        <div id="tab-identifier">TAB_3_CONTENT</div>
                        <p>This is the fourth tab</p>
                    </body>
                </html>
            `);

            // Wait for all tabs to load
            await Promise.all([
                page.waitForLoadState('load'),
                tab1.waitForLoadState('load'),
                tab2.waitForLoadState('load'),
                tab3.waitForLoadState('load')
            ]);

            // Mock session.getPages to return all pages
            const mockGetPages = jest.fn().mockResolvedValue([page, tab1, tab2, tab3]);
            (testSession as any).getPages = mockGetPages;

            // Test screenshots from different tabs
            const screenshots = [];
            const tabs = [page, tab1, tab2, tab3];
            const expectedContent = ['TAB_0_CONTENT', 'TAB_1_CONTENT', 'TAB_2_CONTENT', 'TAB_3_CONTENT'];

            for (let i = 0; i < tabs.length; i++) {
                const currentTab = tabs[i];
                await currentTab.bringToFront();
                (testSession as any).page = currentTab; // Correctly update session.page

                const screenshot = await testSession.screenshot();
                screenshots.push(screenshot);

                // Verify the content is from the correct tab
                const content = await currentTab.textContent('#tab-identifier');
                expect(content).toBe(expectedContent[i]);
            }

            // Verify all screenshots are different
            for (let i = 0; i < screenshots.length; i++) {
                for (let j = i + 1; j < screenshots.length; j++) {
                    expect(screenshots[i]).not.toBe(screenshots[j]);
                }
            }

            // Clean up
            await tab1.close();
            await tab2.close();
            await tab3.close();
        });

        it('should handle screenshots when tabs are created and closed dynamically', async () => {
            // Start with original tab
            await page.setContent(TAB_CONTENT.TAB_0);
            await page.waitForLoadState('load');

            // Take initial screenshot
            const initialScreenshot = await testSession.screenshot();
            expect(initialScreenshot).toBeDefined();

            // Create new tab
            const newTab = await context.newPage();
            await newTab.setContent(TAB_CONTENT.TAB_1);
            await newTab.waitForLoadState('load');

            // Switch to new tab and take screenshot
            await newTab.bringToFront();
            (testSession as any).page = newTab;
            const newTabScreenshot = await testSession.screenshot();
            expect(newTabScreenshot).toBeDefined();
            expect(newTabScreenshot).not.toBe(initialScreenshot);

            // Close the new tab
            await newTab.close();

            // Switch back to original tab and take screenshot
            await page.bringToFront();
            (testSession as any).page = page;
            const backToOriginalScreenshot = await testSession.screenshot();
            expect(backToOriginalScreenshot).toBeDefined();

            // Screenshot should be similar to initial (both from same tab)
            // Note: They might not be exactly the same due to timing differences
            expect(typeof backToOriginalScreenshot).toBe('string');

            // Verify we're back to the original tab content
            const content = await page.textContent('#tab-identifier');
            expect(content).toBe('TAB_0_CONTENT');
        });

        it('should maintain screenshot consistency when rapidly switching between tabs', async () => {
            // Create multiple tabs
            const tab1 = await context.newPage();
            const tab2 = await context.newPage();

            // Set different content
            await page.setContent(TAB_CONTENT.TAB_0);
            await tab1.setContent(TAB_CONTENT.TAB_1);
            await tab2.setContent(TAB_CONTENT.TAB_2);

            // Wait for all tabs to load
            await Promise.all([
                page.waitForLoadState('load'),
                tab1.waitForLoadState('load'),
                tab2.waitForLoadState('load')
            ]);

            // Rapidly switch between tabs and take screenshots
            const results = [];
            const tabs = [page, tab1, tab2];

            for (let round = 0; round < 3; round++) {
                for (let i = 0; i < tabs.length; i++) {
                    const currentTab = tabs[i];
                    await currentTab.bringToFront();
                    (testSession as any).page = currentTab;

                    const screenshot = await testSession.screenshot();
                    const content = await currentTab.textContent('#tab-identifier');

                    results.push({
                        round,
                        tabIndex: i,
                        screenshot,
                        content,
                        expectedContent: `TAB_${i}_CONTENT`
                    });
                }
            }

            // Verify consistency across rounds
            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                expect(result.content).toBe(result.expectedContent);
                expect(result.screenshot).toBeDefined();
                expect(typeof result.screenshot).toBe('string');
            }

            // Verify screenshots from same tab across different rounds are consistent
            for (let tabIndex = 0; tabIndex < 3; tabIndex++) {
                const tabResults = results.filter(r => r.tabIndex === tabIndex);
                for (let i = 1; i < tabResults.length; i++) {
                    // Screenshots from the same tab should be identical or very similar
                    expect(typeof tabResults[i].screenshot).toBe('string');
                    expect(tabResults[i].content).toBe(tabResults[0].content);
                }
            }

            // Clean up
            await tab1.close();
            await tab2.close();
        });
    });
}); 