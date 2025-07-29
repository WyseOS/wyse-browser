import { Page } from 'playwright';
import { Logger } from '@nestjs/common';
import { SendAlarm } from './alarm';

// A utility class for handling cursor animations and visual effects in Playwright.
export class AnimationUtils {
    private logger: Logger;
    private last_cursor_position: { x: number, y: number } = { x: 0.0, y: 0.0 };

    constructor() {
        this.logger = new Logger(AnimationUtils.name);
    }

    public getLastCursorPosition(): { x: number, y: number } {
        return this.last_cursor_position;
    }

    /***
     * Highlight the element with the given identifier and insert a custom cursor on the page.
     * @param page The Playwright page object.
     * @param identifier The element identifier.
     * @returns void
     ***/
    async add_cursor_box(page: Page, identifier: string): Promise<void> {
        try {
            // 1. Highlight the element (if it exists)
            await page.evaluate(`
                (identifier) => {
                    const elm = document.querySelector(\`[__elementId='\${identifier}']\`);
                    if (elm) {
                        elm.style.transition = 'border 0.3s ease-in-out';
                        elm.style.border = '2px solid red';
                    }
                }
            `, identifier);

            // Give time for the border transition
            await page.waitForTimeout(300);

            // 2. Create a custom cursor (only if it doesn't already exist)
            await page.evaluate(`
                () => {
                    let cursor = document.getElementById('red-cursor');
                    if (!cursor) {
                        cursor = document.createElement('div');
                        cursor.id = 'red-cursor';
                        cursor.style.width = '12px';
                        cursor.style.height = '12px';
                        cursor.style.position = 'absolute';
                        cursor.style.borderRadius = '50%';
                        cursor.style.zIndex = '999999';        // Large z-index to appear on top
                        cursor.style.pointerEvents = 'none';    // Don't block clicks
                        // A nicer cursor: red ring with a white highlight and a soft shadow
                        cursor.style.background = 'radial-gradient(circle at center, #fff 20%, #f00 100%)';
                        cursor.style.boxShadow = '0 0 6px 2px rgba(255,0,0,0.5)';
                        cursor.style.transition = 'left 0.1s linear, top 0.1s linear';
                        document.body.appendChild(cursor);
                    }
                }
            `);
        }
        catch (error) {
            this.logger.error(`Failed to add cursor box: ${error.message}`);
            await SendAlarm.sendTextMessage('Failed to add cursor box', error.message);
        }
    }

    /***
     * Animate the cursor movement gradually from start to end coordinates.
     * @param page The Playwright page object.
     * @param start_x The starting x-coordinate.
     * @param start_y The starting y-coordinate.
     * @param end_x The ending x-coordinate.
     * @param end_y The ending y-coordinate.
     * @param steps The number of small steps for the movement. Default: 20
     * @param step_delay The delay (in seconds) between steps. Default: 0.05
     * @returns void
    ***/
    async gradual_cursor_animation(
        page: Page,
        start_x: number,
        start_y: number,
        end_x: number,
        end_y: number,
        steps: number = 20,
        step_delay: number = 0.05,
    ): Promise<void> {
        try {
            for (let i = 0; i < steps; i++) {
                // Linear interpolation
                const x = start_x + (end_x - start_x) * (i / steps)
                const y = start_y + (end_y - start_y) * (i / steps)

                await page.evaluate(`
                    ([x, y]) => {
                        const cursor = document.getElementById('red-cursor');
                        if (cursor) {
                            cursor.style.left = x + 'px';
                            cursor.style.top = y + 'px';
                        }
                    }
                `, [x, y]);

                await page.waitForTimeout(step_delay * 1000);
            }

            // Final position
            await page.evaluate(`
                ([x, y]) => {
                    const cursor = document.getElementById('red-cursor');
                    if (cursor) {
                        cursor.style.left = x + 'px';
                        cursor.style.top = y + 'px';
                    }
                }
            `, [end_x, end_y]);
        }
        catch (error) {
            this.logger.error(`Failed to animate cursor: ${error.message}`);
            await SendAlarm.sendTextMessage('Failed to animate cursor', error.message);
        }
        finally {
            this.last_cursor_position = { x: end_x, y: end_y };
        }
    }


    /*** 
     * Remove the highlight from the element and the custom cursor from the page.
     * @param page The Playwright page object.
     * @param identifier The element identifier.
     * @returns void
    ***/
    async remove_cursor_box(page: Page, identifier: string): Promise<void> {
        try {
            await page.evaluate(`
                (identifier) => {
                    // Remove highlight
                    const elm = document.querySelector(\`[__elementId='\${identifier}']\`);
                    if (elm) {
                        elm.style.border = '';
                    }
                    // Remove cursor
                    const cursor = document.getElementById('red-cursor');
                    if (cursor) {
                        cursor.remove();
                    }
                }
            `, identifier);
        }
        catch (error) {
            this.logger.error(`Failed to remove cursor box: ${error.message}`);
            await SendAlarm.sendTextMessage('Failed to remove cursor box', error.message);
        }
    }

    /***
     * Clean up any cursor animations or highlights that were added by animate_actions.
     * This includes removing the red cursor element and any element highlights.
     * @param page The Playwright page object.
     * @returns void
    */
    async cleanup_animations(page: Page): Promise<void> {
        try {
            //Remove cursor and highlights using the same approach as in remove_cursor_box
            await page.evaluate(`
                () => {
                    // Remove cursor
                    const cursor = document.getElementById('red-cursor');
                    if (cursor) {
                        cursor.remove();
                    }
                    // Remove highlights from all elements
                    const elements = document.querySelectorAll('[__elementId]');
                    elements.forEach(el => {
                        if (el.style.border && el.style.transition) {
                            el.style.border = '';
                            el.style.transition = '';
                        }
                    });
                }
            `);
        }
        catch (error) {
            this.logger.error(`Failed to cleanup animations: ${error.message}`);
            await SendAlarm.sendTextMessage('Failed to cleanup animations', error.message);
        }
        finally {
            // Reset the last cursor position
            this.last_cursor_position = { x: 0.0, y: 0.0 };
        }
    }
}