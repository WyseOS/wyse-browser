import { Session } from './session';
import { BrowserActionParameters } from "./interfaces/iaction";
import { BrowserActionType, DefaultWidth, DefaultHeight, DefaultTimeout, DefaultElementTimeout, GetInitJS } from "./constants/index";
import { Logger } from '@nestjs/common';
import { AnimationUtils } from './utils/animation';
import { ActionErrorHandler } from './utils/error-handler';
import { ParameterValidator } from './utils/parameter-validator';
import { errors, Page } from 'playwright';

export class BrowserAction {
    private logger: Logger = new Logger(BrowserAction.name);

    private initJS: string = GetInitJS();
    private animate_actions: boolean = false;
    private animation: AnimationUtils = new AnimationUtils();
    //Use animation utils for cursor position tracking
    private last_cursor_position = this.animation.getLastCursorPosition()

    private page: Page;

    async action(session: Session, page_id: number, action_name: string, params: BrowserActionParameters): Promise<string> {
        const parameters: Map<string, string | number> = new Map();
        for (const [paramName, paramValue] of Object.entries(params)) {
            parameters.set(paramName, paramValue);
        }

        await this.ensureSessionReady(session);

        let pages = await session.getPages();
        if (page_id < 0 || page_id >= pages.length) {
            const errorMessage = `Start Action ${action_name}, Page ID ${page_id} is out of range. Available page range: 0-${pages.length - 1}. Session ID: ${session.id}`;
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        const page = pages[page_id];
        this.page = page;

        let result = "";
        try {
            switch (action_name.toLowerCase()) {
                case (BrowserActionType.Url):
                    result = await this.action_url(page);
                    break
                case (BrowserActionType.Visit):
                    await this.action_visit(page, parameters);
                    break
                case (BrowserActionType.History):
                    await this.action_history(page, parameters);
                    break
                case (BrowserActionType.Search):
                    await this.action_search(page, parameters);
                    break
                case (BrowserActionType.RefreshPage):
                    await this.action_refresh(page);
                    break
                case (BrowserActionType.Click):
                    await this.action_click(page, parameters);
                    break
                case (BrowserActionType.ClickFull):
                    await this.action_click_full(page, parameters);
                    break;
                case (BrowserActionType.DoubleClick):
                    await this.action_double_click(page, parameters);
                    break
                case (BrowserActionType.Text):
                    await this.action_text(page, parameters);
                    break
                case (BrowserActionType.ScrollUp):
                    await this.action_scroll_up(page);
                    break
                case (BrowserActionType.ScrollDown):
                    await this.action_scroll_down(page);
                    break
                case (BrowserActionType.ScrollElementUp):
                    await this.action_scroll_element_up(page, parameters);
                    break
                case (BrowserActionType.ScrollElementDown):
                    await this.action_scroll_element_down(page, parameters);
                    break
                case (BrowserActionType.ScrollTo):
                    await this.action_scroll_to(page, parameters);
                    break
                case (BrowserActionType.Wait):
                    await this.wait(page, parameters);
                    break
                case (BrowserActionType.KeyPress):
                    await this.action_key_press(page, parameters);
                    break
                case (BrowserActionType.HOVER):
                    await this.action_hover(page, parameters);
                    break
                case (BrowserActionType.Evaluate):
                    result = await this.evaluate(page, parameters);
                    break
                case (BrowserActionType.InitJS):
                    await this.init_js(page);
                    break
                case (BrowserActionType.WaitForLoadState):
                    await this.wait_for_load_state(page);
                    break
                case (BrowserActionType.Content):
                    result = await this.action_content(page);
                    break
                case (BrowserActionType.CreateTab):
                    await this.action_create_tab(page, parameters);
                    break
                case (BrowserActionType.SwitchTab):
                    await this.action_switch_tab(page, parameters);
                    break
                case (BrowserActionType.CloseTab):
                    await this.action_close_tab(page, parameters);
                    break
                case (BrowserActionType.TabsInfo):
                    const tabsResult = await this.action_tabs_info(session, page_id);
                    result = JSON.stringify(tabsResult);
                    break
                case (BrowserActionType.CleanupAnimations):
                    await this.action_cleanup_animations(page);
                    break
                case (BrowserActionType.PreviewAction):
                    await this.preview_action(page, parameters);
                    break
                case (BrowserActionType.SetContent):
                    await this.action_set_content(page, parameters);
                    break
                case (BrowserActionType.EnsurePageReady):
                    await this.ensure_page_ready(page);
                    break
                case (BrowserActionType.SelectOption):
                    await this.action_select_option(page, parameters);
                    break
                case (BrowserActionType.Drag):
                    await this.action_drag(page, parameters);
                    break
                case (BrowserActionType.Screenshot):
                    result = await this.action_screenshot(page);
                    break
                default:
                    const error_msg = `Browser Action ${action_name} not support yet, Session id: ${session.id}`;
                    this.logger.log(error_msg);
                    throw new Error(error_msg);
            }

            session.updateActionTimestamp();

            if (action_name === BrowserActionType.Evaluate || action_name === BrowserActionType.TabsInfo || action_name === BrowserActionType.SetContent) {
                this.logger.log(`Browser Action ${action_name} finished. Session: ${session.id}, Timestamp: ${session.lastActionTimestamp}`);
            } else {
                this.logger.log(`Browser Action ${action_name} finished. Session: ${session.id}, Params: ${JSON.stringify(params)}, Timestamp: ${session.lastActionTimestamp}`);
            }

            return String(result);
        } catch (error) {
            const actionError = ActionErrorHandler.createActionError(action_name, session.id, error, params);
            this.logger.error(actionError.message);
            const url = await page.url();
            throw actionError;
        }
    }

    private async ensureSessionReady(session: Session): Promise<void> {
        if (!session.isInitialized) {
            await session.waitForInitialization();
        }
    }

    // In the BrowserAction class, ensure proper validation:
    async action_url(page) {
        try {
            // Check if page context exists
            if (!this.page) {
            throw new Error("Page context is not available");
            }
            
            const url = await page.url();            
            return url;
        } catch (error) {
            console.error("Error in action_url:", error);
            throw error;
        }
    }

    async action_visit(page, parameters) {
        let url = ParameterValidator.validateString(parameters.get("url"), 'url', false);

        const internalSchemes = [
            'about:',
            'data:',
            'file:',
            'chrome:',
            'chrome-extension:',
            'javascript:',
            'http:',
            'https:',
            'ws:',
            'wss:',
            'ftp:',
            'ftps:',
            'mailto:',
        ];

        const isInternalScheme = internalSchemes.some(scheme => url.startsWith(scheme));
        if (!isInternalScheme) {
            url = 'https://' + url;
        }

        await page.goto(url);
        await this.ensure_page_ready(page);

        //ToDo: handle download files
    }

    async action_history(page, parameters) {
        let num = Number(parameters.get("num"));

        if (num > 0) {
            for (let i = 0; i < num; i++) {
                await page.goForward();
                await this.ensure_page_ready(page);
            }
        } else if (num < 0) {
            for (let i = 0; i < num * -1; i++) {
                await page.goBack({ waitUntil: "load", timeout: DefaultTimeout });
                await this.ensure_page_ready(page);
            }
        }
        // num === 0, skip
    }

    async action_search(page, parameters) {
        let text = parameters.get("search_key").toString();
        await page.goto(`https://www.google.com/search?q=${encodeURIComponent(text)}`);
        await this.ensure_page_ready(page);
    }

    async action_refresh(page) {
        await page.reload();
        await this.ensure_page_ready(page);
    }

    async action_click(page, parameters) {
        if (parameters.has("element_id")) {
            const element_id = ParameterValidator.validateElementId(parameters.get("element_id"));
            const target = page.locator("[__elementId='" + element_id + "']");
            try {
                await target.waitFor({ state: 'attached', timeout: DefaultElementTimeout });

                // check element state
                const elementInfo = await target.evaluate((el: HTMLElement) => {
                    const isVisible = el.offsetParent !== null &&
                        window.getComputedStyle(el).display !== 'none' &&
                        window.getComputedStyle(el).visibility !== 'hidden';

                    const isDisabled = el instanceof HTMLButtonElement || el instanceof HTMLInputElement
                        ? el.disabled
                        : el.hasAttribute('disabled') ||
                        el.getAttribute('aria-disabled') === 'true' ||
                        el.classList.contains('disabled');

                    return {
                        isVisible,
                        isDisabled,
                        tagName: el.tagName.toLowerCase(),
                        id: el.id,
                        className: el.className,
                        textContent: el.textContent?.trim() || ''
                    };
                });

                if (!elementInfo.isVisible) {
                    this.logger.log(`Element with element_id ${element_id} is not visible, skipping click.`);
                    return;
                }

                if (elementInfo.isDisabled) {
                    this.logger.log(`Element with element_id ${element_id} is disabled, skipping click.`);
                    return;
                }

                await target.scrollIntoViewIfNeeded();
                await target.click({ delay: 100 });
            } catch (error) {
                this.logger.error("Error clicking element:", error);
                throw error;
            }
        } else {
            const { x, y } = ParameterValidator.validateCoordinates(
                parameters.get("x"),
                parameters.get("y")
            );
            await page.mouse.click(x, y, { delay: 100 });
        }
        await page.waitForTimeout(500);
    }

    async action_click_full(page, parameters) {
        const hold = Math.max(0, Number(parameters.get("hold") || 0.0));
        const button = parameters.get("button") || "left";

        if (parameters.has("element_id")) {
            let element_id = parameters.get("element_id").toString();
            const target = page.locator("[__elementId='" + element_id + "']");

            // Wait for element to be visible and clickable
            await target.waitFor({ state: 'visible', timeout: DefaultElementTimeout });
            await target.scrollIntoViewIfNeeded();

            // Check if element is disabled before attempting click
            const isDisabled = await target.evaluate((el: HTMLElement) => {
                if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
                    return el.disabled;
                }
                if (el instanceof HTMLElement) {
                    return el.hasAttribute('disabled') ||
                        el.getAttribute('aria-disabled') === 'true' ||
                        el.classList.contains('disabled');
                }
                return false;
            });

            if (isDisabled) {
                const elementInfo = await target.evaluate((el: HTMLElement) => {
                    return {
                        tagName: el.tagName.toLowerCase(),
                        id: el.id,
                        className: el.className,
                        textContent: el.textContent?.trim() || ''
                    };
                });
                const errorMessage = `Cannot click on disabled element. Element info: ${JSON.stringify(elementInfo)}`;
                this.logger.error(errorMessage);
                return;
            }

            if (hold > 0) {
                await target.click({ button, delay: hold * 1000 });
            } else {
                await target.click({ button });
            }
        } else {
            let x = Number(parameters.get("x"));
            let y = Number(parameters.get("y"));

            if (hold > 0) {
                await page.mouse.move(x, y);
                await page.mouse.down({ button });
                await page.waitForTimeout(hold * 1000);
                await page.mouse.up({ button });
            } else {
                await page.mouse.click(x, y, { button });
            }
        }
        await page.waitForTimeout(500);
    }

    async action_double_click(page, parameters) {
        if (parameters.has("element_id")) {
            let element_id = parameters.get("element_id").toString();
            const target = page.locator("[__elementId='" + element_id + "']");
            try {
                await target.waitFor({ state: 'visible', timeout: DefaultElementTimeout });
                await target.scrollIntoViewIfNeeded();

                // Check if element is disabled before attempting double click
                const isDisabled = await target.evaluate((el: HTMLElement) => {
                    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
                        return el.disabled;
                    }
                    if (el instanceof HTMLElement) {
                        return el.hasAttribute('disabled') ||
                            el.getAttribute('aria-disabled') === 'true' ||
                            el.classList.contains('disabled');
                    }
                    return false;
                });

                if (isDisabled) {
                    const elementInfo = await target.evaluate((el: HTMLElement) => {
                        return {
                            tagName: el.tagName.toLowerCase(),
                            id: el.id,
                            className: el.className,
                            textContent: el.textContent?.trim() || ''
                        };
                    });
                    const errorMessage = `Cannot double click on disabled element. Element info: ${JSON.stringify(elementInfo)}`;
                    this.logger.error(errorMessage);
                    return;
                }

                await target.dblclick({ delay: 100 });
            } catch (error) {
                this.logger.error("Error double clicking element:", error);
                throw error;
            }
        } else {
            let x = Number(parameters.get("x"));
            let y = Number(parameters.get("y"));
            await page.mouse.dblclick(x, y, { delay: 100 });
        }
    }

    async action_text(page, parameters) {
        const text = ParameterValidator.validateString(parameters.get("text"), 'text', true);
        const pressEnter = ParameterValidator.validateOptionalBoolean(parameters.get("press_enter"), 'press_enter', false);
        const deleteExistingText = ParameterValidator.validateOptionalBoolean(parameters.get("delete_existing_text"), 'delete_existing_text', false);

        this.logger.log(`action_text: ${parameters.get("element_id")}, ${text}, ${pressEnter}, ${deleteExistingText}`);

        const currentUrl = await page.url();
        // 特殊处理Google搜索页面
        if (currentUrl.includes('google') &&
            (currentUrl.endsWith('.google.com/') ||
                currentUrl.endsWith('.google.com') ||
                currentUrl.includes('google.com/?') ||
                currentUrl.includes('google.com/webhp'))) {

            const googleSearchBox = page.locator('textarea[name="q"], textarea[title="搜索"], textarea[aria-label="搜索"], textarea.gLFyf').first();
            await googleSearchBox.waitFor({ state: 'visible', timeout: DefaultElementTimeout });
            await googleSearchBox.scrollIntoViewIfNeeded();
            await googleSearchBox.click({ delay: 100 });
            if (deleteExistingText) {
                await googleSearchBox.fill(text);
            } else {
                await googleSearchBox.type(text);
            }
            if (pressEnter) {
                await googleSearchBox.press("Enter");
            }
            return;
        }

        if (parameters.has("element_id")) {
            const element_id = parameters.get("element_id").toString();
            const target = page.locator("[__elementId='" + element_id + "']");
            await target.waitFor({ state: 'visible', timeout: DefaultElementTimeout });
            await target.scrollIntoViewIfNeeded();

            try {
                await target.focus();
                if (deleteExistingText) {
                    await target.fill(text);
                } else {
                    await target.type(text);
                }
                if (pressEnter) {
                    await target.press("Enter");
                }
            } catch (error) {
                this.logger.error(`无法填充元素: ${error.message}`);
                // 备用方案：使用JavaScript直接操作DOM
                await target.evaluate((el: HTMLElement, value: string, shouldDelete: boolean, shouldPressEnter: boolean) => {
                    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                        if (shouldDelete) {
                            el.value = value;
                        } else {
                            el.value += value;
                        }
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        if (shouldPressEnter) {
                            el.form?.submit();
                        }
                    }
                }, text, deleteExistingText, pressEnter);
                throw error;
            }
        } else {
            const x = Number(parameters.get("x"));
            const y = Number(parameters.get("y"));

            if (isNaN(x) || isNaN(y)) {
                const errorMessage = "Invalid coordinates provided for text input. Both x and y must be valid numbers.";
                this.logger.error(errorMessage);
                throw new Error(errorMessage);
            }

            await page.mouse.click(x, y, { delay: 100 });

            if (deleteExistingText) {
                await page.keyboard.press('Control+A');
                await page.keyboard.press('Backspace');
            }

            await page.keyboard.type(text);
            if (pressEnter) {
                await page.keyboard.press("Enter");
                this.logger.log(`Pressed Enter after typing text at coordinates (${x}, ${y})`);
            }
        }
        await page.waitForTimeout(500);
    }

    async action_scroll_up(page) {
        await page.keyboard.press('PageUp');
        await page.waitForTimeout(1000);
    }

    async action_scroll_down(page) {
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(1000);
    }

    async action_scroll_element_up(page, parameters) {
        await this.action_click(page, parameters);
        let page_number = Number(parameters.get("page_number"));
        if (page_number > 0) {
            for (let i = 0; i < page_number; i++) {
                await page.keyboard.press('PageUp');
                await page.waitForTimeout(1000);
            }
        }
    }

    async action_scroll_element_down(page, parameters) {
        await this.action_click(page, parameters);
        let page_number = Number(parameters.get("page_number"));
        if (page_number > 0) {
            for (let i = 0; i < page_number; i++) {
                await page.keyboard.press('PageDown');
                await page.waitForTimeout(1000);
            }
        }
    }

    async action_scroll_to(page, parameters) {
        if (!parameters.has("element_id")) {
            return "not found element_id"
        }

        let element_id = parameters.get("element_id").toString();
        const target = page.locator("[__elementId='" + element_id + "']");
        await target.waitFor({ state: 'visible', timeout: DefaultElementTimeout });
        await target.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1000);
        return ""
    }

    async action_hover(page, parameters) {
        if (parameters.has("element_id")) {
            let element_id = parameters.get("element_id").toString();
            const target = page.locator("[__elementId='" + element_id + "']");
            try {
                await target.waitFor({ state: 'visible', timeout: DefaultElementTimeout });
                await target.scrollIntoViewIfNeeded();
                await target.hover();
            } catch (error) {
                this.logger.error("Error hovering element:", error);
                throw error;
            }
        } else if (parameters.has("x") && parameters.has("y")) {
            let x = Number(parameters.get("x"));
            let y = Number(parameters.get("y"));
            try {
                await page.mouse.move(x, y);
            } catch (error) {
                this.logger.error("Error hovering at coordinates:", error);
                throw error;
            }
        } else {
            const errorMessage = "Either element_id or both x and y coordinates must be provided for hover action";
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        }
        await page.waitForTimeout(500);
    }

    async action_key_press(page, parameters) {
        if (!parameters.has("keys")) {
            this.logger.error("No keys provided for key_press action");
            return;
        }

        const keys = ParameterValidator.validateKeys(parameters.get("keys"));

        try {
            for (const key of keys) {
                await page.keyboard.press(key);
                await page.waitForTimeout(500);
            }
        } catch (error) {
            this.logger.error(`Error pressing keys: ${error.message}`);
            throw error;
        }
    }

    async action_drag(page, parameters) {
        if (!parameters.has("drag_path")) {
            const errorMessage = "drag_path parameter is required for drag action";
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        const dragPath = parameters.get("drag_path");
        let pathArray: Array<{ x: number, y: number }>;

        try {
            if (typeof dragPath === 'string') {
                pathArray = JSON.parse(dragPath);
            } else if (Array.isArray(dragPath)) {
                pathArray = dragPath;
            } else {
                throw new Error("drag_path must be a JSON string or array");
            }

            // Validate path structure
            if (!Array.isArray(pathArray) || pathArray.length < 2) {
                throw new Error("drag_path must contain at least 2 points (start and end)");
            }

            // Validate each point has x and y coordinates
            for (let i = 0; i < pathArray.length; i++) {
                const point = pathArray[i];
                if (typeof point !== 'object' || point === null) {
                    throw new Error(`Invalid point at index ${i}: must be an object`);
                }
                if (typeof point.x !== 'number' || typeof point.y !== 'number') {
                    throw new Error(`Invalid point at index ${i}: must have numeric x and y properties`);
                }
                ParameterValidator.validateNumber(point.x, `point[${i}].x`, 0, 10000);
                ParameterValidator.validateNumber(point.y, `point[${i}].y`, 0, 10000);
            }

            const startPoint = pathArray[0];
            const endPoint = pathArray[pathArray.length - 1];

            this.logger.log(`Starting drag operation from (${startPoint.x}, ${startPoint.y}) to (${endPoint.x}, ${endPoint.y})`);

            // Perform the drag operation
            await page.mouse.move(startPoint.x, startPoint.y);
            await page.mouse.down();

            // If there are intermediate points, follow the path
            if (pathArray.length > 2) {
                for (let i = 1; i < pathArray.length - 1; i++) {
                    const point = pathArray[i];
                    await page.mouse.move(point.x, point.y);
                    await page.waitForTimeout(50); // Small delay for smooth movement
                }
            }

            await page.mouse.move(endPoint.x, endPoint.y);
            await page.mouse.up();

            // Wait for any potential animations or state changes
            await page.waitForTimeout(500);

            this.logger.log(`Drag operation completed successfully`);
        } catch (error) {
            const errorMessage = `Drag operation failed: ${error.message}`;
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async wait(page, parameters) {
        const second = ParameterValidator.validateTime(parameters.get("time"));
        if (second > 0) {
            await page.waitForTimeout(second * 1000);
        }
    }

    async action_select_option(page, parameters) {
        if (parameters.has("element_id")) {
            const element_id = ParameterValidator.validateElementId(parameters.get("element_id"));
            const target = page.locator("[__elementId='" + element_id + "']");

            try {
                // 首先检查元素是否存在
                await target.waitFor({ state: 'attached', timeout: DefaultElementTimeout });

                // 检查元素类型以决定处理方式
                const elementInfo = await target.evaluate((el: HTMLElement) => {
                    return {
                        tagName: el.tagName.toLowerCase(),
                        type: el.getAttribute('type'),
                        isVisible: el.offsetParent !== null,
                        isOption: el.tagName.toLowerCase() === 'option'
                    };
                });

                if (elementInfo.isOption) {
                    // 处理HTML <option> 元素
                    const optionData = await target.evaluate((optionEl: HTMLOptionElement) => {
                        const selectEl = optionEl.closest('select');
                        return {
                            value: optionEl.value,
                            text: optionEl.textContent?.trim() || '',
                            index: optionEl.index,
                            selectElementId: selectEl?.getAttribute('__elementId'),
                            selectId: selectEl?.id,
                            selectExists: !!selectEl
                        };
                    });

                    if (!optionData.selectExists) {
                        throw new Error(`Option element found but no parent select element exists for element_id: ${element_id}`);
                    }

                    // 优先使用__elementId查找父级select，否则使用id
                    let selectLocator;
                    if (optionData.selectElementId) {
                        selectLocator = page.locator(`[__elementId='${optionData.selectElementId}']`);
                    } else if (optionData.selectId) {
                        selectLocator = page.locator(`#${optionData.selectId}`);
                    } else {
                        // 最后备选方案：通过option元素找到父级select
                        selectLocator = target.locator('xpath=ancestor::select[1]');
                    }

                    await selectLocator.waitFor({ state: 'visible', timeout: DefaultElementTimeout });
                    await selectLocator.scrollIntoViewIfNeeded();

                    // 尝试多种选择方式，从最可靠到最宽泛
                    const selectionMethods = [
                        () => selectLocator.selectOption({ value: optionData.value }),
                        () => selectLocator.selectOption({ label: optionData.text }),
                        () => selectLocator.selectOption({ index: optionData.index }),
                        () => selectLocator.selectOption(target)
                    ];

                    let lastError;
                    for (const method of selectionMethods) {
                        try {
                            await method();
                            this.logger.log(`Successfully selected option with element_id: ${element_id}, value: ${optionData.value}, text: ${optionData.text}`);
                            return;
                        } catch (error) {
                            lastError = error;
                            continue;
                        }
                    }

                    throw new Error(`Failed to select option with all methods. Last error: ${lastError?.message}`);
                } else {
                    // 处理非option元素（自定义下拉菜单、按钮等）
                    if (elementInfo.isVisible) {
                        // 元素可见，直接点击
                        await target.waitFor({ state: 'visible', timeout: DefaultElementTimeout });
                        await target.scrollIntoViewIfNeeded();
                        await target.click({ delay: 100 });
                        this.logger.log(`Successfully clicked element with element_id: ${element_id}`);
                    } else {
                        // 元素不可见，可能是隐藏的自定义元素，尝试强制点击
                        await target.scrollIntoViewIfNeeded();
                        await target.click({ force: true, delay: 100 });
                        this.logger.log(`Successfully force-clicked hidden element with element_id: ${element_id}`);
                    }
                }
            } catch (error) {
                this.logger.error(`Error selecting element with element_id ${element_id}:`, error);
                throw error;
            }
        } else if (parameters.has("x") && parameters.has("y")) {
            // 处理坐标点击
            const { x, y } = ParameterValidator.validateCoordinates(
                parameters.get("x"),
                parameters.get("y")
            );
            try {
                // 先检查点击位置的元素类型
                const elementAtPosition = await page.evaluate(([clickX, clickY]) => {
                    const element = document.elementFromPoint(clickX, clickY);
                    if (!element) return null;

                    return {
                        tagName: element.tagName.toLowerCase(),
                        isSelect: element.tagName.toLowerCase() === 'select',
                        isOption: element.tagName.toLowerCase() === 'option',
                        elementId: element.getAttribute('__elementId'),
                        id: element.id,
                        className: element.className
                    };
                }, [x, y]);

                if (elementAtPosition?.isSelect) {
                    // 如果点击的是select元素，先点击展开，再等待用户进一步操作
                    await page.mouse.click(x, y, { delay: 100 });
                    this.logger.log(`Clicked on select element at coordinates: (${x}, ${y}), dropdown should be opened`);
                } else if (elementAtPosition?.isOption) {
                    // 如果点击的是option元素，尝试找到父级select并使用selectOption
                    const selectInfo = await page.evaluate(() => {
                        const option = document.elementFromPoint(arguments[0], arguments[1]) as HTMLOptionElement;
                        const select = option?.closest('select');
                        return select ? {
                            elementId: select.getAttribute('__elementId'),
                            id: select.id,
                            optionValue: option.value,
                            optionText: option.textContent?.trim(),
                            optionIndex: option.index
                        } : null;
                    }, x, y);

                    if (selectInfo) {
                        let selectLocator;
                        if (selectInfo.elementId) {
                            selectLocator = page.locator(`[__elementId='${selectInfo.elementId}']`);
                        } else if (selectInfo.id) {
                            selectLocator = page.locator(`#${selectInfo.id}`);
                        }

                        if (selectLocator) {
                            await selectLocator.selectOption({ value: selectInfo.optionValue });
                            this.logger.log(`Selected option via coordinates: (${x}, ${y}), value: ${selectInfo.optionValue}`);
                        } else {
                            // 降级到直接点击
                            await page.mouse.click(x, y, { delay: 100 });
                            this.logger.log(`Fallback clicked at coordinates: (${x}, ${y})`);
                        }
                    } else {
                        await page.mouse.click(x, y, { delay: 100 });
                        this.logger.log(`Clicked at coordinates: (${x}, ${y})`);
                    }
                } else {
                    // 普通元素，直接点击
                    await page.mouse.click(x, y, { delay: 100 });
                    this.logger.log(`Successfully clicked at coordinates: (${x}, ${y})`);
                }
            } catch (error) {
                this.logger.error("Error clicking at coordinates:", error);
                throw error;
            }
        } else {
            const errorMessage = "Either element_id or both x and y coordinates must be provided for select_option action";
            this.logger.error(errorMessage);
            throw new Error(errorMessage);
        }

        // 等待操作完成
        await page.waitForTimeout(500);
    }

    async action_create_tab(page, parameters) {
        let url = "about:blank";
        if (parameters.has("url") && parameters.get("url") !== null && parameters.get("url") !== undefined && parameters.get("url") !== "") {
            url = parameters.get("url").toString();
        }

        const context = page.context();
        try {
            const newPage = await context.newPage();
            await newPage.goto(url);
            await this.ensure_page_ready(newPage);
            this.logger.log(`Created new tab and navigated to: ${url}`);
        } catch (error) {
            this.logger.error(`Failed to create new tab: ${error.message}`);
            throw error;
        }
    }

    async action_switch_tab(page, parameters) {
        if (!parameters.has("tab_index")) {
            this.logger.error("Parameter tab_index is required for switch_tab action");
            return;
        }

        const tabIndex = Number(parameters.get("tab_index"));
        if (isNaN(tabIndex) || tabIndex < 0) {
            this.logger.error(`Invalid tab_index: ${parameters.get("tab_index")}. Must be a non-negative number.`);
            return;
        }

        const context = page.context();
        const pages = await context.pages();

        if (tabIndex >= pages.length) {
            this.logger.error(`Tab index ${tabIndex} is out of range. Total tabs: ${pages.length}`);
            return;
        }

        try {
            const targetTab = pages[tabIndex];
            await targetTab.bringToFront();
            this.logger.log(`Successfully switched to tab index: ${tabIndex}`);
        } catch (error) {
            this.logger.error(`Failed to switch to tab: ${error.message}`);
            throw error;
        }
    }

    async action_close_tab(page, parameters) {
        if (!parameters.has("tab_index")) {
            this.logger.error("Parameter tab_index is required for close_tab action");
            return;
        }

        const tabIndex = Number(parameters.get("tab_index"));
        if (isNaN(tabIndex) || tabIndex < 0) {
            this.logger.error(`Invalid tab_index: ${parameters.get("tab_index")}. Must be a non-negative number.`);
            return;
        }

        const context = page.context();
        const pages = await context.pages();

        if (tabIndex >= pages.length) {
            this.logger.error(`Tab index ${tabIndex} is out of range. Total tabs: ${pages.length}`);
            return;
        }

        if (pages.length <= 1) {
            this.logger.error("Cannot close the last remaining tab");
            return;
        }

        try {
            const targetTab = pages[tabIndex];
            await targetTab.close();
            this.logger.log(`Successfully closed tab index: ${tabIndex}`);
        } catch (error) {
            this.logger.error(`Failed to close tab: ${error.message}`);
            throw error;
        }
    }

    /**
     * Returns the number of tabs and a newline delineated string describing each of them. 
     * An example of the string is:
     *
     * Tab 0: <Tab_Title> (<URL>) [CURRENTLY SHOWN] [CONTROLLED]
     * Tab 1: <Tab_Title> (<URL>) [CONTROLLED]
     * Tab 2: <Tab_Title> (<URL>) [CONTROLLED]
     *
     * @param session - The browser session containing the tabs
     * @param page_id - The index of the currently active page
     * @returns Promise<Object> containing:
     *   - tabCount: number - The number of tabs
     *   - tabsInfo: string - String describing each tab
     */
    async action_tabs_info(session: Session, page_id: number): Promise<{ tabCount: number; tabsInfo: string }> {
        try {
            const pages = await session.getPages();

            if (page_id < 0 || page_id >= pages.length) {
                throw new Error(`Action tabs_info: Page ID ${page_id} is out of range. Available page range: 0-${pages.length - 1}`);
            }

            const tabsInformation: Array<{
                index: number;
                title: string;
                url: string;
                isActive: boolean;
                isControlled: boolean;
            }> = [];

            for (let i = 0; i < pages.length; i++) {
                const currentPage = pages[i];
                const title: string = await currentPage.title();
                const url: string = await currentPage.url();
                const isActive: boolean = i === page_id;
                const isControlled: boolean = true; // All pages are controlled

                tabsInformation.push({
                    index: i,
                    title,
                    url,
                    isActive,
                    isControlled
                });
            }

            const tabCount: number = tabsInformation.length;
            const tabsInfoString: string = tabsInformation
                .map(tab => {
                    let tabInfo = `Tab ${tab.index}: ${tab.title} (${tab.url})`;
                    if (tab.isActive) {
                        tabInfo += ' [CURRENTLY SHOWN]';
                    }
                    if (tab.isControlled) {
                        tabInfo += ' [CONTROLLED]';
                    }
                    return tabInfo;
                })
                .join('\n');

            return {
                tabCount,
                tabsInfo: tabsInfoString
            };
        } catch (error) {
            this.logger.error(`Failed to get tabs information: ${error.message}`);
            throw error;
        }
    }

    async wait_for_load_state(page) {
        if (!page) {
            throw new Error('Page is null or undefined');
        }

        try {
            await page.waitForLoadState('load', { timeout: DefaultTimeout });
        } catch (error) {
            this.logger.error(`wait_for_load_state, Page load timeout, page might not be loaded, error: ${error.message}`);
            throw error;
        }
    }

    async evaluate(page, parameters) {
        if (!page) {
            throw new Error('Page is null or undefined');
        }

        if (!parameters.has("script")) {
            return "no script to run";
        }

        // Ensure page is ready before evaluating script
        await this.ensure_page_ready(page);

        let script = parameters.get("script").toString();

        try {
            // Generic handling: if script appears to be a function definition, wrap it for execution
            let executableScript = script;
            if (script.match(/^\s*(\(\s*\)\s*=>|function\s*\(\s*\))/)) {
                executableScript = `(${script})()`;
            }

            let result = await page.evaluate(executableScript);

            // 根据结果类型返回不同格式
            let resultString;

            if (result === null || result === undefined) {
                resultString = "null";
            } else if (typeof result === 'object') {
                resultString = JSON.stringify(result);
            } else {
                resultString = String(result);
            }
            return resultString;
        } catch (error) {
            this.logger.error(`evaluate failed, script: ${script}, error: ${error.message}`);
            throw error;
        }
    }

    async init_js(page) {
        try {
            await page.evaluate(this.initJS);

            // 添加滚动状态检测
            await page.evaluate(`
                document.addEventListener('scroll', function() {
                    document.documentElement.classList.add('scrolling');
                    setTimeout(function() {
                        document.documentElement.classList.remove('scrolling');
                    }, 150);
                }, { passive: true });
            `);

            this.logger.log('Page JavaScript initialization completed');
        } catch (error) {
            this.logger.error(`init_js failed, error: ${error.message}`);
            // 不抛出错误，让页面继续工作
        }
    }

    async action_content(page) {
        let content = await page.content();
        return content;
    }

    /**
     * Takes a screenshot of the current page
     * @param page - The page to take screenshot of
     * @returns Promise<string> containing the base64 encoded screenshot
     */
    async action_screenshot(page: any): Promise<string> {
        try {
            const currentUrl = page.url();
            const isSpecialPage = this.isSpecialBrowserPage(currentUrl);
            if (!isSpecialPage) {
                await this.ensure_page_ready(page);
            }


            const buffer = await page.screenshot({ timeout: 10000, fullPage: false });

            const base64Screenshot = buffer.toString('base64');
            this.logger.log(`Screenshot taken successfully for page URL: ${currentUrl}`);
            return base64Screenshot;
        } catch (error) {
            this.logger.error(`Screenshot action failed for page: ${error.message}`);

            // Get URL for error reporting if possible
            let currentUrl = 'unknown';
            try {
                currentUrl = page.url();
            } catch (urlError) {
                // Ignore
            }

            throw new Error(`Screenshot failed: ${error.message}`);
        }
    }


    private isSpecialBrowserPage(url: string): boolean {
        if (url === 'about:blank') return true;

        if (url.startsWith('chrome://')) return true;
        if (url.startsWith('chrome-error://')) return true;
        if (url.startsWith('chrome-extension://')) return true;

        if (url.startsWith('about:')) return true;
        if (url.startsWith('edge://')) return true;
        if (url.startsWith('firefox://')) return true;
        if (url.startsWith('view-source:')) return true;

        if (url.startsWith('devtools://')) return true;
        if (url.includes('__playwright_proxy__')) return true;

        if (url.startsWith('file://')) return true;
        if (url.startsWith('data:')) return true;

        return false;
    }

    // animations
    async action_cleanup_animations(page) {
        await this.animation.cleanup_animations(page);
    }

    /**
     * Previews an action by simulating cursor movement and element highlighting without executing the actual action.
     * This method is used to demonstrate interactive actions like clicks or hovers before user confirmation.
     * 
     * @param page - The Playwright page object to perform the preview on
     * @param element_id - The unique element_id of the target element
     * @throws {Error} When the target element is not visible on the page
     * @throws {TimeoutError} When the element fails to appear within the specified timeout period
     */
    async preview_action(page, parameters) {
        if (!parameters.has("element_id")) {
            throw new Error("element_id is required for preview_action");
        }

        const element_id = parameters.get("element_id").toString();
        await this.ensure_page_ready(page);
        const target = page.locator(`[__elementId='${element_id}']`);
        try {
            await target.waitFor({ state: 'visible', timeout: DefaultElementTimeout });
            await target.scrollIntoViewIfNeeded();
        } catch (error) {
            if (error instanceof errors.TimeoutError) {
                throw new Error(`Element with element_id ${element_id} not found or not visible`);
            }
        }

        // Retrieve bounding box to determine the center for cursor movement
        const box = await target.bounding_box();
        if (!box) {
            throw new Error(`Element with element_id ${element_id} has no bounding box`);
        }

        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        if (this.animate_actions) {
            await this.animation.add_cursor_box(page, element_id);
            const { x: startX, y: startY } = this.last_cursor_position;
            await this.animation.gradual_cursor_animation(
                page, startX, startY, centerX, centerY
            );
        }
    }

    /**
     * Sets the HTML content of the current page
     * @param page - The Playwright page object
     * @param parameters - Map containing the HTML content to set
     * @throws {Error} When the content parameter is missing or invalid
     */
    async action_set_content(page, parameters) {
        if (!parameters.has("content")) {
            throw new Error("content parameter is required for set_content action");
        }

        const content = ParameterValidator.validateString(parameters.get("content"), 'content', true);

        try {
            await page.setContent(content, {
                waitUntil: 'load',
                timeout: DefaultTimeout
            });
            await this.ensure_page_ready(page);
            this.logger.log(`Successfully set page content`);
        } catch (error) {
            this.logger.error(`Failed to set page content: ${error.message}`);
            throw error;
        }
    }

    // wait for page to be ready
    //https://playwright.dev/docs/api/class-page#page-wait-for-load-state
    async ensure_page_ready(page) {
        if (!page) {
            throw new Error('Page is null or undefined');
        }

        try {
            await page.waitForLoadState('load', { timeout: DefaultTimeout });
        } catch (error) {
            this.logger.error(`ensure_page_ready, Page load timeout, page might not be loaded, error: ${error.message}`);
            // ignore error and stop page loading
            await page.evaluate("window.stop()")
        }

        // check if there is a need to resize the viewport
        const viewport = await page.viewportSize();
        if (viewport.width != DefaultWidth || viewport.height != DefaultHeight) {
            await page.setViewportSize({ width: DefaultWidth, height: DefaultHeight });
        }

        await this.init_js(page);
    }
}