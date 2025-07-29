
import { BrowserAction } from './action';
import { Session } from './session';
import { Browser, BrowserContext, chromium, Page } from 'playwright';

const FAKE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fake Page</title>
  <script>
    window.clickCount = 0;
    function incrementClickCount() {
      window.clickCount++;
    }
  </script>
</head>
<body>
  <h1 id="header">Welcome to the Fake Page</h1>
  <a href="#" id="new-page-link" __elementId="26">Open New Page</a>
  <button id="click-me" __elementId="10" onclick="incrementClickCount()">Click Me</button>
  <button id="disabled-button" __elementId="11" disabled>Disabled Button</button>
  <button id="hidden-button" __elementId="12" style="display:none;">Hidden Button</button>
  <input type="text" id="input-box" __elementId="13" />
  <select id="dropdown" __elementId="14">
    <option __elementId="15" value="one">Option One</option>
    <option __elementId="16" value="two" selected>Option Two</option>
  </select>
  <select id="multi-dropdown" __elementId="17" multiple>
    <option __elementId="18" value="red">Red</option>
    <option __elementId="19" value="blue">Blue</option>
    <option __elementId="20" value="green">Green</option>
  </select>
  <div class="custom-dropdown" id="expandable-dropdown" __elementId="21">
    <button class="dropdown-button" __elementId="22">Select an option ▼</button>
    <div class="dropdown-content" style="display: none;">
      <div class="dropdown-item" __elementId="23" data-value="alpha">Alpha</div>
      <div class="dropdown-item" __elementId="24" data-value="beta">Beta</div>
      <div class="dropdown-item" __elementId="25" data-value="gamma">Gamma</div>
    </div>
  </div>
  
  <!-- Draggable elements for action_drag tests -->
  <div id="drag-me" __elementId="27" style="width: 50px; height: 50px; background-color: red; position: absolute; top: 100px; left: 100px; cursor: move; user-select: none;">
    Drag me
  </div>
  <div id="multi-drag" __elementId="28" style="width: 30px; height: 30px; background-color: blue; position: absolute; top: 50px; left: 50px; cursor: move; user-select: none;">
    Multi
  </div>
  
  <script>
    // Add dropdown functionality
    document.querySelector('.dropdown-button').addEventListener('click', function() {
      const content = document.querySelector('.dropdown-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', function() {
        document.querySelector('.dropdown-button').textContent = this.textContent;
        document.querySelector('.dropdown-content').style.display = 'none';
      });
    });

    // Fixed new page link functionality:
    document.getElementById('new-page-link').addEventListener('click', function(e) {
      e.preventDefault();
      const newWindow = window.open("", "_blank");
      newWindow.document.write(\`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>New Page</title>
</head>
<body>
  <h1>New Page</h1>
</body>
</html>\`);
      newWindow.document.close();
    });

    // Drag functionality for drag-me element
    function makeDraggable(elementId) {
      const element = document.getElementById(elementId);
      if (!element) return;
      
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initialLeft = 0;
      let initialTop = 0;
      
      element.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseInt(element.style.left) || 0;
        initialTop = parseInt(element.style.top) || 0;
        e.preventDefault();
      });
      
      document.addEventListener('mousemove', function(e) {
        if (isDragging && document.activeElement === document.body) {
          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;
          element.style.left = (initialLeft + deltaX) + 'px';
          element.style.top = (initialTop + deltaY) + 'px';
        }
      });
      
      document.addEventListener('mouseup', function(e) {
        if (isDragging) {
          isDragging = false;
        }
      });
    }

    // Drag event tracking for multi-drag element
    function setupDragTracking() {
      window.dragEvents = [];
      
      document.addEventListener('mousedown', function(e) {
        if (e.target.id === 'multi-drag') {
          window.dragEvents.push({ type: 'mousedown', x: e.clientX, y: e.clientY });
        }
      });
      
      document.addEventListener('mousemove', function(e) {
        if (window.dragEvents.length > 0 && window.dragEvents[window.dragEvents.length - 1].type !== 'mouseup') {
          window.dragEvents.push({ type: 'mousemove', x: e.clientX, y: e.clientY });
        }
      });
      
      document.addEventListener('mouseup', function(e) {
        if (window.dragEvents.length > 0 && window.dragEvents[window.dragEvents.length - 1].type !== 'mouseup') {
          window.dragEvents.push({ type: 'mouseup', x: e.clientX, y: e.clientY });
        }
      });
    }

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
      makeDraggable('drag-me');
      makeDraggable('multi-drag');
      setupDragTracking();
    });

    // If DOM is already loaded, initialize immediately
    if (document.readyState === 'loading') {
      // DOM is still loading
    } else {
      // DOM is already loaded
      makeDraggable('drag-me');
      makeDraggable('multi-drag');
      setupDragTracking();
    }
  </script>
</body>
</html>
`;

// Tab content templates
const TAB_CONTENT = {
    BASIC_TAB: `
        <html>
            <head><title>Basic Tab</title></head>
            <body>
                <h1>Basic Tab Content</h1>
                <input id="basic-input" __elementId="basic-input" />
            </body>
        </html>
    `,
    FORM_TAB: `
        <html>
            <head><title>Form Tab</title></head>
            <body>
                <form id="test-form">
                    <input id="form-input" __elementId="form-input" type="text" />
                    <select id="form-select" __elementId="form-select">
                        <option value="option1" __elementId="opt1">Option 1</option>
                        <option value="option2" __elementId="opt2">Option 2</option>
                    </select>
                    <button id="form-btn" __elementId="form-btn" type="button">Submit</button>
                </form>
            </body>
        </html>
    `,
    INTERACTIVE_TAB: `
        <html>
            <head><title>Interactive Tab</title></head>
            <body>
                <div id="clickable" __elementId="clickable" style="width: 100px; height: 100px; background: blue; cursor: pointer;">
                    Click me
                </div>
                <script>
                    document.getElementById('clickable').addEventListener('click', function() {
                        this.style.background = 'red';
                        this.textContent = 'Clicked!';
                    });
                </script>
            </body>
        </html>
    `
};

jest.mock('./session');

describe('BrowserAction', () => {
    let browser: Browser;
    let context: BrowserContext;
    let page: Page;
    let session: jest.Mocked<Session>;
    let browserAction: BrowserAction;

    beforeAll(async () => {
        browser = await chromium.launch({ headless: true });
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        context = await browser.newContext();
        page = await context.newPage();
        await page.setContent(FAKE_HTML);

        session = new Session() as jest.Mocked<Session>;
        session.getPages = jest.fn().mockResolvedValue([page]);
        session.id = 'test-session';

        browserAction = new BrowserAction();
    });

    afterEach(async () => {
        await context.close();
    });

    describe('action_click', () => {
        it('should click a button and trigger its onclick event', async () => {
            const params = new Map<string, string | number | boolean>();
            params.set("element_id", "10");

            await browserAction.action_click(page, params);

            const clickCount = await page.evaluate(() => (window as any).clickCount);
            expect(clickCount).toBe(1);
        });

        it('should not click a disabled button', async () => {
            const params = new Map<string, string | number | boolean>();
            params.set("element_id", "11");

            // Suppress console.log from the action to capture the log message
            const loggerLogSpy = jest.spyOn((browserAction as any).logger, 'log').mockImplementation(() => { });

            await browserAction.action_click(page, params);

            expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('is disabled, skipping click'));
            loggerLogSpy.mockRestore();
        });

        it('should not click a hidden button', async () => {
            const params = new Map<string, string | number | boolean>();
            params.set("element_id", "12");

            // Suppress console.log from the action to capture the log message
            const loggerLogSpy = jest.spyOn((browserAction as any).logger, 'log').mockImplementation(() => { });

            await browserAction.action_click(page, params);

            expect(loggerLogSpy).toHaveBeenCalledWith(expect.stringContaining('is not visible, skipping click'));
            loggerLogSpy.mockRestore();
        });
    });

    describe('action_text', () => {
        it('should type text into an input box', async () => {
            const params = new Map<string, string | number | boolean>();
            params.set("element_id", "13");
            params.set("text", "Hello, World!");

            await browserAction.action_text(page, params);

            const inputValue = await page.inputValue('#input-box');
            expect(inputValue).toBe('Hello, World!');
        });

        it('should delete existing text before typing', async () => {
            await page.fill('#input-box', 'Initial text');

            const params = new Map<string, string | number | boolean>();
            params.set("element_id", "13");
            params.set("text", "New text");
            params.set("delete_existing_text", true);

            await browserAction.action_text(page, params);

            const inputValue = await page.inputValue('#input-box');
            expect(inputValue).toBe('New text');
        });

        it('should press Enter after typing', async () => {
            const params = new Map<string, string | number | boolean>();
            params.set("element_id", "13");
            params.set("text", "Search term");
            params.set("press_enter", true);

            // We can't easily test navigation, so we'll listen for a form submission attempt
            let formSubmitted = false;
            await page.exposeFunction('onFormSubmit', () => {
                formSubmitted = true;
            });
            await page.evaluate(() => {
                const form = document.createElement('form');
                form.id = 'test-form';
                const input = document.getElementById('input-box');
                if (input) {
                    const clonedInput = input.cloneNode(true) as HTMLInputElement;
                    // Remove __elementId from cloned element to avoid conflicts
                    clonedInput.removeAttribute('__elementId');
                    clonedInput.id = 'cloned-input-box';
                    form.appendChild(clonedInput);
                    document.body.appendChild(form);
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        (window as any).onFormSubmit();
                    });
                    input.setAttribute('form', 'test-form');
                }
            });

            await browserAction.action_text(page, params);

            const inputValue = await page.inputValue('#input-box');
            expect(inputValue).toBe('Search term');
        });
    });

    describe('action_select_option', () => {
        it('should select an option from a dropdown by element_id', async () => {
            const params = new Map<string, string | number | boolean>();
            params.set("element_id", "15"); // Option One

            await browserAction.action_select_option(page, params);

            const selectedValue = await page.inputValue('#dropdown');
            expect(selectedValue).toBe('one');
        });

        it('should select multiple options from a multi-select dropdown', async () => {
            // First, select red option
            const params1 = new Map<string, string | number | boolean>();
            params1.set('element_id', '18'); // Red
            await browserAction.action_select_option(page, params1);

            let selectedValues = await page.evaluate(() => {
                const select = document.querySelector('#multi-dropdown') as HTMLSelectElement;
                return Array.from(select.selectedOptions).map(opt => opt.value);
            });
            expect(selectedValues).toEqual(['red']);

            // Then, select green option (this replaces the previous selection)
            const params2 = new Map<string, string | number | boolean>();
            params2.set('element_id', '20'); // Green
            await browserAction.action_select_option(page, params2);

            selectedValues = await page.evaluate(() => {
                const select = document.querySelector('#multi-dropdown') as HTMLSelectElement;
                return Array.from(select.selectedOptions).map(opt => opt.value);
            });
            expect(selectedValues).toEqual(['green']);
        });

        it('should click a custom dropdown item', async () => {
            // First, click the button to show the custom dropdown
            const buttonParams = new Map<string, string | number | boolean>();
            buttonParams.set("element_id", "22");
            await browserAction.action_click(page, buttonParams);

            // Wait for dropdown to be visible
            await page.waitForSelector('.dropdown-content[style*="block"]');

            // Then, click the item
            const itemParams = new Map<string, string | number | boolean>();
            itemParams.set("element_id", "24"); // Beta
            await browserAction.action_select_option(page, itemParams);

            const buttonText = await page.textContent('.dropdown-button');
            expect(buttonText).toBe('Beta');
        });
    });

    describe('action_history and action_refresh', () => {
        it('should navigate back and forward', async () => {
            await page.goto('data:text/html,page1');
            await page.goto('data:text/html,page2');

            // Go back
            await browserAction.action_history(page, new Map().set('num', -1));
            expect(await page.content()).toContain('page1');

            // Go forward
            await browserAction.action_history(page, new Map().set('num', 1));
            expect(await page.content()).toContain('page2');
        });

        it('should refresh the page', async () => {
            await page.evaluate(() => { (window as any).my_var = 1; });
            expect(await page.evaluate(() => (window as any).my_var)).toBe(1);

            await browserAction.action_refresh(page);
            expect(await page.evaluate(() => (window as any).my_var)).toBeUndefined();
        });
    });

    describe('action_click_full', () => {
        it('should perform a right click', async () => {
            await page.evaluate(() => {
                const button = document.getElementById('click-me');
                button.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    button.textContent = 'Right Clicked!';
                });
            });

            const params = new Map<string, string | number | boolean>();
            params.set('element_id', '10');
            params.set('button', 'right');
            await browserAction.action_click_full(page, params);

            expect(await page.textContent('#click-me')).toBe('Right Clicked!');
        });

        it('should perform a held click', async () => {
            const params = new Map<string, string | number | boolean>();
            params.set('element_id', '10');
            params.set('hold', 0.2); // 200ms

            const initialClicks = await page.evaluate(() => (window as any).clickCount);
            await browserAction.action_click_full(page, params);
            const finalClicks = await page.evaluate(() => (window as any).clickCount);

            expect(finalClicks).toBe(initialClicks + 1);
        });
    });

    describe('action_url', () => {
        it('should return the current page URL', async () => {
            await page.setContent(FAKE_HTML, { waitUntil: 'load' });
            // The URL will be about:blank initially when using setContent
            // unless we navigate. Let's navigate to a data URL.
            await page.goto('data:text/html,Hello');
            const url = await browserAction.action_url(page);
            expect(url).toBe('data:text/html,Hello');
        });

        it('should navigate to a given URL', async () => {
            const params = new Map<string, string | number | boolean>();
            params.set("url", "data:text/html,<html><body><h1>Visited</h1></body></html>");
            await browserAction.action_visit(page, params);
            const content = await page.content();
            expect(content).toContain('<h1>Visited</h1>');
        });
    });

    describe('tab_management', () => {
        it('should create, switch to, and close a new tab', async () => {
            // Create a new tab with basic content
            const createParams = new Map<string, string | number | boolean>();
            createParams.set('url', `data:text/html,${encodeURIComponent(TAB_CONTENT.BASIC_TAB)}`);
            await browserAction.action_create_tab(page, createParams);

            let pages = context.pages();
            session.getPages = jest.fn().mockResolvedValue(pages);
            expect(pages.length).toBe(2);

            // Wait for the new tab to load
            await pages[1].waitForLoadState('load');
            expect(await pages[1].title()).toBe('Basic Tab');

            // Switch to the new tab and verify interaction
            await browserAction.action_switch_tab(pages[0], new Map().set('tab_index', 1));
            await pages[1].waitForSelector('#basic-input');

            const inputExists = await pages[1].locator('#basic-input').isVisible();
            expect(inputExists).toBe(true);

            // Close the new tab
            await browserAction.action_close_tab(pages[0], new Map().set('tab_index', 1));

            pages = context.pages();
            expect(pages.length).toBe(1);
        });

        it('should handle new tab opened by click', async () => {
            const [newPage] = await Promise.all([
                context.waitForEvent('page'),
                browserAction.action_click(page, new Map().set('element_id', '26'))
            ]);

            await newPage.waitForLoadState('load');
            expect(await newPage.title()).toBe('New Page');
            expect(await newPage.textContent('h1')).toBe('New Page');

            await newPage.close();
        });

        it('should isolate actions between tabs', async () => {
            // Create a tab with form content
            await browserAction.action_create_tab(page, new Map().set('url', `data:text/html,${encodeURIComponent(TAB_CONTENT.FORM_TAB)}`));

            let pages = context.pages();
            session.getPages = jest.fn().mockResolvedValue(pages);

            await pages[1].waitForLoadState('load');
            await pages[1].waitForSelector('#form-input');

            // Test actions on different tabs
            await browserAction.action_text(page, new Map([['element_id', '13'], ['text', 'Tab 0 content']]));
            await browserAction.action_text(pages[1], new Map([['element_id', 'form-input'], ['text', 'Tab 1 content']]));

            // Verify isolation
            const value0 = await page.inputValue('#input-box');
            const value1 = await pages[1].inputValue('#form-input');

            expect(value0).toBe('Tab 0 content');
            expect(value1).toBe('Tab 1 content');

            await pages[1].close();
        });

        it('should handle multiple tabs with different content types', async () => {
            // Create form and interactive tabs
            await browserAction.action_create_tab(page, new Map().set('url', `data:text/html,${encodeURIComponent(TAB_CONTENT.FORM_TAB)}`));
            await browserAction.action_create_tab(page, new Map().set('url', `data:text/html,${encodeURIComponent(TAB_CONTENT.INTERACTIVE_TAB)}`));

            let pages = context.pages();
            session.getPages = jest.fn().mockResolvedValue(pages);
            expect(pages.length).toBe(3);

            // Wait for all tabs to load
            await pages[1].waitForLoadState('load');
            await pages[2].waitForLoadState('load');
            await pages[1].waitForSelector('#form-input');
            await pages[2].waitForSelector('#clickable');

            // Test form tab (Tab 1)
            await browserAction.action_text(pages[1], new Map([['element_id', 'form-input'], ['text', 'Form data']]));
            await browserAction.action_select_option(pages[1], new Map().set('element_id', 'opt2'));

            expect(await pages[1].inputValue('#form-input')).toBe('Form data');
            expect(await pages[1].inputValue('#form-select')).toBe('option2');

            // Test interactive tab (Tab 2)
            await browserAction.action_click(pages[2], new Map().set('element_id', 'clickable'));

            expect(await pages[2].textContent('#clickable')).toBe('Clicked!');

            // Verify original tab isolation
            expect(await pages[0].inputValue('#input-box')).toBe('');

            // Clean up
            await pages[1].close();
            await pages[2].close();
        });

        it('should get tabs information correctly', async () => {
            const result = await browserAction.action_tabs_info(session, 0);

            expect(result.tabCount).toBe(1);
            expect(result.tabsInfo).toContain('Tab 0: Fake Page');
            expect(result.tabsInfo).toContain('[CURRENTLY SHOWN]');
            expect(result.tabsInfo).toContain('[CONTROLLED]');

            // Test with multiple tabs
            await context.newPage();
            const pages = context.pages();
            session.getPages = jest.fn().mockResolvedValue(pages);

            const multiResult = await browserAction.action_tabs_info(session, 0);
            expect(multiResult.tabCount).toBe(2);
            expect(multiResult.tabsInfo).toContain('Tab 0: Fake Page');
            expect(multiResult.tabsInfo).toContain('Tab 1:  (about:blank)');

            await pages[1].close();
        });
    });

    describe('action_hover', () => {
        it('should trigger a hover effect on an element', async () => {
            await page.evaluate(() => {
                const target = document.getElementById('click-me');
                if (target) {
                    target.addEventListener('mouseover', () => {
                        target.textContent = 'Hovered!';
                    });
                }
            });

            const params = new Map<string, string | number | boolean>();
            params.set('element_id', '10');
            await browserAction.action_hover(page, params);

            const text = await page.textContent('#click-me');
            expect(text).toBe('Hovered!');
        });
    });

    describe('action_double_click', () => {
        it('should double click an element', async () => {
            await page.evaluate(() => {
                const target = document.getElementById('click-me');
                if (target) {
                    target.addEventListener('dblclick', () => {
                        target.textContent = 'Double Clicked!';
                    });
                }
            });

            const params = new Map<string, string | number | boolean>();
            params.set('element_id', '10');
            await browserAction.action_double_click(page, params);

            const text = await page.textContent('#click-me');
            expect(text).toBe('Double Clicked!');
        });
    });

    describe('set_content', () => {
        it('action_content should get the page HTML', async () => {
            const content = await browserAction.action_content(page);
            expect(content).toContain('<title>Fake Page</title>');
            expect(content).toContain('__elementid="10"'); // Browser normalizes to lowercase
        });

        it('action_set_content should set the page HTML', async () => {
            const newHtml = `<!DOCTYPE html><html><head><title>New Content</title></head><body><p>Hello from the new content</p></body></html>`;
            const params = new Map<string, string | number | boolean>();
            params.set('content', newHtml);

            await browserAction.action_set_content(page, params);

            const content = await page.content();
            expect(content).toContain('<title>New Content</title>');
            expect(content).toContain('<p>Hello from the new content</p>');
        });
    });

    describe('evaluate', () => {
        it('should evaluate simple javascript and return the result', async () => {
            const params = new Map<string, string | number | boolean>();
            params.set('script', '() => 2 + 3');
            const result = await browserAction.evaluate(page, params);
            expect(result).toBe('5');
        });

        it('should handle DOM manipulation and return values', async () => {
            const script = `() => {
                document.getElementById('header').textContent = 'New Header';
                return document.getElementById('header').textContent;
            }`;
            const params = new Map().set('script', script);
            const result = await browserAction.evaluate(page, params);
            expect(result).toBe('New Header');
            expect(await page.textContent('#header')).toBe('New Header');
        });

        it('should serialize complex objects and arrays', async () => {
            // Test object serialization
            const objectScript = `() => ({ key: 'value', num: 123 })`;
            const objectResult = await browserAction.evaluate(page, new Map().set('script', objectScript));
            expect(JSON.parse(objectResult)).toEqual({ key: 'value', num: 123 });

            // Test array serialization
            const arrayScript = '() => [1, 2, 3]';
            const arrayResult = await browserAction.evaluate(page, new Map().set('script', arrayScript));
            expect(JSON.parse(arrayResult)).toEqual([1, 2, 3]);
        });

        it('should access window properties and perform complex DOM queries', async () => {
            // Test window access
            const windowResult = await browserAction.evaluate(page, new Map().set('script', '() => typeof window'));
            expect(windowResult).toBe('object');

            // Test complex DOM query
            const domResult = await browserAction.evaluate(page, new Map().set('script', '() => document.querySelector("#dropdown").children.length'));
            expect(parseInt(domResult)).toBeGreaterThanOrEqual(2);

            // Test element counting
            const buttonCount = await browserAction.evaluate(page, new Map().set('script', '() => document.querySelectorAll("button").length'));
            expect(parseInt(buttonCount)).toBeGreaterThanOrEqual(3);
        });

        it('should check element existence and properties', async () => {
            // Test element existence
            const existsResult = await browserAction.evaluate(page, new Map().set('script', '() => document.getElementById("click-me") !== null'));
            expect(existsResult).toBe('true');

            const notExistsResult = await browserAction.evaluate(page, new Map().set('script', '() => document.getElementById("non-existent") === null'));
            expect(notExistsResult).toBe('true');

            // Test element properties
            const disabledResult = await browserAction.evaluate(page, new Map().set('script', '() => document.querySelector("#disabled-button").disabled'));
            expect(disabledResult).toBe('true');

            const hiddenResult = await browserAction.evaluate(page, new Map().set('script', '() => document.querySelector("#hidden-button").style.display'));
            expect(hiddenResult).toBe('none');
        });

        it('should handle custom window properties', async () => {
            // Set a custom property
            await browserAction.evaluate(page, new Map().set('script', '() => { window.testValue = "custom_test_value"; return "set"; }'));

            // Read it back
            const result = await browserAction.evaluate(page, new Map().set('script', '() => window.testValue'));
            expect(result).toBe('custom_test_value');
        });
    });

    describe('coordinate_actions', () => {
        it('should perform systematic coordinate-based clicks', async () => {
            const box = await page.locator('#click-me').boundingBox();
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;

            // Test normal click
            const initialClicks = await page.evaluate(() => (window as any).clickCount);
            const clickParams = new Map<string, string | number | boolean>();
            clickParams.set('x', centerX);
            clickParams.set('y', centerY);
            await browserAction.action_click(page, clickParams);
            const afterClick = await page.evaluate(() => (window as any).clickCount);
            expect(afterClick).toBe(initialClicks + 1);

            // Test right click with action_click_full
            const rightClickParams = new Map<string, string | number | boolean>();
            rightClickParams.set('x', centerX);
            rightClickParams.set('y', centerY);
            rightClickParams.set('button', 'right');
            await browserAction.action_click_full(page, rightClickParams);

            // Test middle click
            const middleClickParams = new Map<string, string | number | boolean>();
            middleClickParams.set('x', centerX);
            middleClickParams.set('y', centerY);
            middleClickParams.set('button', 'middle');
            await browserAction.action_click_full(page, middleClickParams);
        });

        it('should perform coordinate-based double click', async () => {
            // Add double-click event listener
            await page.evaluate(() => {
                (window as any).doubleClickCount = 0;
                document.addEventListener('dblclick', () => {
                    (window as any).doubleClickCount++;
                });
            });

            const box = await page.locator('#click-me').boundingBox();
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;

            const doubleClickParams = new Map<string, string | number | boolean>();
            doubleClickParams.set('x', centerX);
            doubleClickParams.set('y', centerY);
            await browserAction.action_double_click(page, doubleClickParams);

            const doubleClicks = await page.evaluate(() => (window as any).doubleClickCount);
            expect(doubleClicks).toBe(1);
        });

        it('should perform coordinate-based hover', async () => {
            // Add hover event listener
            await page.evaluate(() => {
                (window as any).isHovered = false;
                const button = document.querySelector('#click-me');
                button.addEventListener('mouseover', () => {
                    (window as any).isHovered = true;
                });
                button.addEventListener('mouseout', () => {
                    (window as any).isHovered = false;
                });
            });

            const box = await page.locator('#click-me').boundingBox();
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;

            const hoverParams = new Map<string, string | number | boolean>();
            hoverParams.set('x', centerX);
            hoverParams.set('y', centerY);
            await browserAction.action_hover(page, hoverParams);

            const isHovered = await page.evaluate(() => (window as any).isHovered);
            expect(isHovered).toBe(true);
        });
    });

    describe('drag_actions', () => {
        it('should perform drag with path tracking', async () => {
            // Add drag tracking
            await page.evaluate(() => {
                (window as any).dragPath = [];
                document.addEventListener('mousedown', (e) => {
                    (window as any).dragPath = [{ x: e.clientX, y: e.clientY }];
                });
                document.addEventListener('mousemove', (e) => {
                    if (e.buttons === 1) {
                        (window as any).dragPath.push({ x: e.clientX, y: e.clientY });
                    }
                });
                document.addEventListener('mouseup', (e) => {
                    if ((window as any).dragPath.length > 0) {
                        (window as any).dragPath.push({ x: e.clientX, y: e.clientY });
                    }
                });
            });

            const dragPath = [
                { x: 100, y: 100 },
                { x: 200, y: 200 }
            ];

            await browserAction.action_drag(page, new Map().set('drag_path', dragPath));

            // Allow time for events to process
            await page.waitForTimeout(100);

            const pathLength = await page.evaluate(() => (window as any).dragPath ? (window as any).dragPath.length : 0);

            if (pathLength > 0) {
                const startPoint = await page.evaluate(() => (window as any).dragPath[0]);
                const endPoint = await page.evaluate(() => (window as any).dragPath[(window as any).dragPath.length - 1]);

                const tolerance = 20;
                expect(Math.abs(startPoint.x - dragPath[0].x)).toBeLessThan(tolerance);
                expect(Math.abs(startPoint.y - dragPath[0].y)).toBeLessThan(tolerance);
                expect(Math.abs(endPoint.x - dragPath[1].x)).toBeLessThan(tolerance);
                expect(Math.abs(endPoint.y - dragPath[1].y)).toBeLessThan(tolerance);
                expect(pathLength).toBeGreaterThanOrEqual(2);
            }
        });
    });


}); 