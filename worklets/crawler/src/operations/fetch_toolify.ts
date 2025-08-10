import fs from 'fs';
import _ from "lodash";
import { Page } from "@playwright/test";

interface SecondCategoryItem {
    parentName: string;
    name: string;
    url: string;
    count: number;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const fetch_items = async (page: Page, parentName: string, name: string, url: string, count: number): Promise<{ err: string; items: SecondCategoryItem[] }> => {
    let err = "";
    const items: SecondCategoryItem[] = [];
    items.push({ parentName: parentName, name: name, url: url, count: count });
    return { err, items };
}

const fetch_second_category = async (page: Page, name: string): Promise<{ err: string; items: SecondCategoryItem[] }> => {
    let err = "";
    const items: SecondCategoryItem[] = [];

    try {
        // 定位分组：优先通过 id，兼容简单 slug 与 &=>and 两种变体；失败则回退通过 h3 文本
        const buildSlugs = (input: string): string[] => {
            const base = input.toLowerCase().trim();
            const slugSimple = base
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            const slugAnd = base
                .replace(/&/g, 'and')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            return _.uniq([slugSimple, slugAnd]);
        };

        const slugs = buildSlugs(name);
        let groupLocator = page.locator('#__never_match__');
        for (const slug of slugs) {
            const candidate = page.locator(`#group-${slug}`);
            if (await candidate.count() > 0) {
                groupLocator = candidate;
                break;
            }
        }

        if (await groupLocator.count() === 0) {
            // Fallback: find a group container whose h3 matches the provided name (trim 忽略大小写)
            const pattern = new RegExp(`^\\s*${escapeRegex(name)}\\s*$`, 'i');
            groupLocator = page
                .locator('div[id^="group-"]')
                .filter({ has: page.locator('h3', { hasText: pattern }) });
        }

        await groupLocator.first().waitFor();
        await groupLocator.first().scrollIntoViewIfNeeded();

        const linksRoot = groupLocator.locator('a.go-category-link');
        await linksRoot.first().waitFor({ timeout: 2000 }).catch(() => { });

        const linkLocators = await linksRoot.all();
        for (const linkLoc of linkLocators) {
            const href = (await linkLoc.getAttribute('href')) || '';
            const fullUrl = href.startsWith('http') ? href : new URL(href, 'https://www.toolify.ai').toString();
            const subName = (await linkLoc.locator(':scope > span').innerText()).trim();
            const countText = (await linkLoc.locator(':scope > div').innerText()).trim();
            const count = parseInt(countText.replace(/[^0-9]/g, ''), 10) || 0;
            items.push({ parentName: name, name: subName, url: fullUrl, count });
        }
    } catch (error) {
        err = error as unknown as string;
        console.error(`Fetch second category error for '${name}':`, err);
    }
    return { err, items };
}

const scroll_preload = async (page: Page): Promise<void> => {
    // 简单的滚动预加载，尽可能触发懒加载
    const maxSteps = 20;
    for (let i = 0; i < maxSteps; i++) {
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
        await page.waitForTimeout(200);
        const atBottom = await page.evaluate(() => (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 2));
        if (atBottom) {
            break;
        }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
};

export const start_from_category = async (page: Page): Promise<string> => {
    try {
        const url = "https://www.toolify.ai/category";
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForSelector(".category-item");
        await page.waitForTimeout(1000);
        await scroll_preload(page);

        const itemElements = await page.$$(".category-item");
        const results: SecondCategoryItem[] = [];
        for (const itemEl of itemElements) {
            try {
                const spanEl = await itemEl.$("span");
                if (!spanEl) {
                    continue;
                }

                const text = await spanEl.evaluate((el: Element) => (el.textContent || "").replace(/\s+/g, " ").trim());
                if (!text) continue;
                const { err, items } = await fetch_second_category(page, text);
                if (err) {
                    console.warn(`Fetch second category failed for '${text}':`, err);
                }
                results.push(...items);
            } catch (e) {
                console.error(`Fetch item error for '${url}':`, e);
                continue;
            }
        }

        console.info(`second-level total: ${results.length}`);
        for (const r of results) {
            console.info(`parent: ${r.parentName}, url: ${r.url}, name: ${r.name}, count: ${r.count}`);
            await fetch_items(page, r.parentName, r.name, r.url, r.count);
        }
    } catch (error) {
        return error as unknown as string;
    }
    return "";
}