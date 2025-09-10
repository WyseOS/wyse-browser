import _ from "lodash";
import { Page } from "@playwright/test";
import { cleanWebsiteUrl, formatCompactNumber, stripImageQueryParams } from './utils';
import { TIMEOUT_MILLISECONDS } from "../constants";
import { IncrementalToolDataManager, ToolData, ToolDetail } from "./tool_data_manager";
import { CategoryDataManager, SecondCategoryItem } from "./catagory_manager";

interface FaqItem {
    question: string;
    answer: string;
}

interface ProductInformation {
    whatIs: string;
    howToUse: string;
    coreFeatures: string[];
    useCases: string[];
}

interface MonthlyVisitors {
    value: number;
    raw: string;
}

interface ItemDetail {
    // name: string;
    // websiteUrl: string;
    // introduction: string;
    addedOn: string;
    monthlyVisitors: MonthlyVisitors;
    socialAndEmail: string[];
    screenshotUrls: string[];
    // productInformation: ProductInformation;
    // faq: FaqItem[];
    // companyName: string;
    // loginUrl: string;
    // signUpUrl: string;
    // pricingUrl: string;

    // facebookUrl: string;
    // twitterUrl: string;
    // githubUrl: string;
    // discordUrl: string;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toAbsoluteToolifyUrl = (maybePath: string): string => {
    if (!maybePath) return '';
    if (/^https?:\/\//i.test(maybePath)) return maybePath;
    try {
        return new URL(maybePath, 'https://www.toolify.ai').toString();
    } catch {
        return maybePath;
    }
};

export const start_from_category = async (url: string, page: Page, categoryManager: CategoryDataManager, dataManager: IncrementalToolDataManager): Promise<string> => {
  try {
    const categoriesToCrawl = categoryManager.getAllSecondCategories();    
    for (let i = 0; i < 1; i++) { // for validation
    // for (let i = 0; i < categoriesToCrawl.length; i++) {
        const catagory = categoriesToCrawl[i];
        const {parentCategory, secondCategory} = catagory;

        const newTools = await scrapeCategoryTools(page, secondCategory.url);
        // 批量添加新工具（自动判断是否已存在）
        const addedCount = dataManager.batchUpsertTools(
            parentCategory,
            secondCategory.name, 
            newTools
        );

        console.log(`新增了 ${addedCount} 个工具`);
    }

    return JSON.stringify([], null, 2);
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2);
  }
};


/**
 * 抓取指定分类的数据
 * @param page Playwright 页面实例
 * @param categoryManager 分类数据管理器
 * @param dataManager 工具数据管理器
 * @param parentCategoryName 一级分类名称 (必须)
 * @param secondCategoryName 二级分类名称 (可选, 如果不提供则抓取该一级分类下的所有二级分类)
 */
export const start_from_specific_category = async (
    baseUrl: string,
    page: Page,
    categoryManager: CategoryDataManager,
    dataManager: IncrementalToolDataManager,
    parentCategoryName: string,
    secondCategoryName?: string
): Promise<string> => {
  try {
    console.log(`\n--- 开始抓取指定分类: ${parentCategoryName}${secondCategoryName ? ` -> ${secondCategoryName}` : ''} ---`);

    let categoriesToCrawl: Array<{ parentName: string; name: string; url: string; count: number; }> = [];

    if (secondCategoryName) {
        // 精确抓取一个二级分类
        const specificCategory = categoryManager.getSecondCategoryByName(parentCategoryName, secondCategoryName);
        if (specificCategory) {
            categoriesToCrawl.push({
                parentName: parentCategoryName,
                name: specificCategory.name,
                url: specificCategory.url,
                count: specificCategory.count
            });
        } else {
            const errorMsg = `未找到指定的二级分类: ${parentCategoryName} -> ${secondCategoryName}`;
            console.error(errorMsg);
            return JSON.stringify({ error: errorMsg }, null, 2);
        }
    } else {
        // 抓取一级分类下的所有二级分类
        const secondCategories = categoryManager.getSecondCategories(parentCategoryName);
        if (secondCategories && secondCategories.length > 0) {
            const parentCategory = categoryManager.getCategoryByName(parentCategoryName);
            categoriesToCrawl = secondCategories.map(sc => ({
                parentName: parentCategoryName,
                name: sc.name,
                url: sc.url,
                count: sc.count
            }));
        } else {
            const errorMsg = `未找到一级分类 '${parentCategoryName}' 或其下无二级分类`;
            console.error(errorMsg);
            return JSON.stringify({ error: errorMsg }, null, 2);
        }
    }

    console.log(`找到 ${categoriesToCrawl.length} 个分类待处理。`);

    for (let i = 0; i < categoriesToCrawl.length; i++) {
        const category = categoriesToCrawl[i];
        console.log(`\n--- 正在处理分类 [${i+1}/${categoriesToCrawl.length}]: ${category.parentName} -> ${category.name} ---`);

        const fullUrl = category.url.startsWith('http') ? category.url : `${baseUrl}/${category.url}`;
        
        const newTools = await scrapeCategoryTools(page, fullUrl);
        console.log(`从 ${fullUrl} 抓取到 ${newTools.length} 个工具。`);
        
        const addedCount = dataManager.batchUpsertTools(
            category.parentName,
            category.name,
            newTools
        );

        console.log(`成功添加/更新 ${addedCount} 个工具到 ${category.parentName} -> ${category.name}`);
    }

    return JSON.stringify({ 
        message: "指定分类抓取完成", 
        parentCategory: parentCategoryName,
        secondCategory: secondCategoryName || "All",
        processedCategories: categoriesToCrawl.length 
    }, null, 2);
    
  } catch (error) {
    console.error("start_from_specific_category 执行出错:", error);
    return JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2);
  }
};

async function scrapeCategoryTools(page: Page, url: string): Promise<ToolData[]> {
  const tools: ToolData[] = [];
  let currentPage = 1;
  
  // 确保初始页面加载完成
  console.log("抓取页面 url = ", url);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('.tools .tool-item', { timeout: 10000 });

  while (true) {
    console.log(`抓取第 ${currentPage} 页...`);
    
    const { cards, logoMap } = await page.evaluate(() => {
      const toText = (el: Element | null): string => (el?.textContent || '').replace(/\s+/g, ' ').trim();
      const containers = Array.from(document.querySelectorAll('.tools'));
      const cards: { toolUrl: string; title: string; description: string; websiteUrl: string; imgSrc: string }[] = [];
      
      containers.forEach(c => {
            const toolCards = Array.from(c.querySelectorAll('.tool-item .tool-card'));
            toolCards.forEach(card => {
                const titleAnchor = card.querySelector('.card-text-content a[href^="/tool/"], .card-text-content a[href^="/zh/tool/"]') as HTMLAnchorElement | null;
                const toolUrl = titleAnchor?.getAttribute('href') || '';
                const title = toText(card.querySelector('.card-text-content h2'));
                const description = toText(card.querySelector('.card-text-content p'));
                const websiteAnchor = Array.from(card.querySelectorAll('a')).find(a => a.querySelector('.visit-btn')) as HTMLAnchorElement | null;
                const websiteUrl = websiteAnchor?.getAttribute('href') || '';
                const img = card.querySelector('.logo-img-wrapper img') as HTMLImageElement | null;
                const imgSrc = img?.getAttribute('src') || '';

                cards.push({ toolUrl, title, description, websiteUrl, imgSrc });
            });
      });
      
      const logoMap: Record<string, string> = {};
      const walk = (obj: unknown): void => {
        if (!obj || typeof obj !== 'object') return;
        const anyObj = obj as Record<string, unknown>;
        const handle = typeof anyObj['handle'] === 'string' ? (anyObj['handle'] as string) : '';
        const websiteLogo = typeof anyObj['website_logo'] === 'string' ? (anyObj['website_logo'] as string) : '';
        if (handle && websiteLogo) logoMap[handle] = websiteLogo;
        for (const key in anyObj) {
          if (Object.prototype.hasOwnProperty.call(anyObj, key)) {
            try { walk(anyObj[key]); } catch { }
          }
        }
      };
      
      try {
        // @ts-ignore
        walk((window as any).__NUXT__);
      } catch { }
      
      return { cards, logoMap };
    });

    const toAbsolute = (maybePath: string): string => {
      if (!maybePath) return '';
      if (/^https?:\/\//i.test(maybePath)) return maybePath;
      return new URL(maybePath, 'https://www.toolify.ai').toString();
    };

    // 处理抓取到的卡片数据
    for (const c of cards) {
        try {
            const match = c.toolUrl.match(/\/tool\/([^\/?#]+)/);
            const handle = match?.[1] || '';
            const logoFromNuxt = handle ? logoMap[handle] : '';
            const logoUrl = logoFromNuxt || toAbsolute(c.imgSrc);
            const cleanedWebsite = cleanWebsiteUrl(c.websiteUrl);

            // 创建 tool 对象
            const tool: ToolData = {
                toolUrl: c.toolUrl,
                logoUrl: logoUrl,
                title: c.title,
                description: c.description,
                website: cleanedWebsite
            };
            
            console.log(`Tool Name: ${c.title}, tool URL: ${c.toolUrl}`);

            try {
                const { err: dErr, detail } = await fetch_item_detail(page, c.title, c.toolUrl);
                if (dErr) {
                    console.warn(`[detail] fetch failed for ${c.toolUrl}: ${dErr}`);
                } else {
                    // 没有错误，更新 detail 字段
                    if (detail && typeof detail === 'object') {
                        // console.log('[detail]:', JSON.stringify(detail, null, 2))

                        tool.detail = detail as ToolDetail; // 更新 tool 对象的 detail 字段
                    }
                }
            } catch (e) {
                console.warn(`[detail] exception for ${c.toolUrl}:`, e);
            }

            // 将 tool 对象添加到 tools 数组中
            tools.push(tool);

        } catch (e) {
            console.error('工具卡片解析失败:', e);
        }
    }

    const hasNextPage = await simpleNavigateToNextPage(page, currentPage);
    if (!hasNextPage) {
        console.log('翻页结束');
        break;
    }
    
    currentPage++;
    await page.waitForTimeout(1000 + Math.random() * 2000); // 随机延时
  }

  return tools;
}

async function simpleNavigateToNextPage(page: Page, currentPage: number): Promise<boolean> {
  try {
    console.log(`准备翻页到第 ${currentPage + 1} 页...`);
    
    // 1. 首先等待分页组件在当前页面上稳定存在
    await page.waitForSelector('.tools-pagination', { timeout: 50000, state: 'attached' });
    console.log('当前页面分页组件已找到');

    // 2. 查找明确的数字链接（下一页）
    const nextPageElement = await page.$(`.tools-pagination a[href*="page=${currentPage + 1}"]`);
    
    if (nextPageElement) {
      const isDisabled = await nextPageElement.getAttribute('disabled');
      if (!isDisabled) {
        console.log(`找到第 ${currentPage + 1} 页链接，准备点击`);
        
        // 3. 记录点击前的状态
        const beforeUrl = page.url();
        
        // 4. 点击下一页
        await nextPageElement.click();
        console.log('已点击翻页链接');

        // 5. 使用多种策略等待新页面加载完成
        try {
          console.log('等待新页面加载...');
          await Promise.race([
            // 等待 URL 发生变化
            page.waitForFunction((oldUrl: string) => window.location.href !== oldUrl, beforeUrl, { timeout: 15000 }),
            // 等待新的分页组件出现 (使用更宽松的条件)
            page.waitForSelector('.tools-pagination', { timeout: 20000, state: 'attached' }),
            // 等待工具项出现
            page.waitForSelector('.tool-item', { timeout: 20000 }),
            // 最长等待时间
            new Promise(resolve => setTimeout(resolve, 15000))
          ]);
          console.log('检测到页面加载完成信号');
        } catch (waitError) {
          console.warn('等待页面加载时遇到预期的超时，但继续执行...');
        }
        
        // 6. 额外等待以确保页面完全稳定
        console.log('执行额外稳定等待...');
        await page.waitForTimeout(3000);
        console.log(`翻页到第 ${currentPage + 1} 页完成`);
        return true;
      } else {
        console.log(`第 ${currentPage + 1} 页链接被禁用`);
      }
    } else {
      console.log(`未找到第 ${currentPage + 1} 页的明确链接`);
    }
    
    console.log('没有找到有效的下一页链接，可能是最后一页');
    return false;
    
  } catch (error) {
    console.error(`翻页到第 ${currentPage + 1} 页时出错:`, error);
    
    // 可选：尝试重新加载页面
    try {
      console.log('尝试重新加载当前页面...');
      await page.reload({ timeout: 15000 });
      await page.waitForTimeout(5000);
      console.log('页面重新加载完成');
      // 返回 true 让主循环决定是否重试
      return true; 
    } catch (reloadError) {
      console.error('页面重新加载失败:', reloadError);
    }
    
    return false;
  }
}

function processDomArray(html: string): string[] {
  // 正则表达式匹配 domArr 数组内容
  const arrayMatch = html.match(/domArr:\s*\[([^\]]*)\]/);
  if (!arrayMatch) return [];
  
  // 提取数组内容部分
  const arrayContent = arrayMatch[1];
  
  // 匹配所有带引号的字符串元素（包括注释）
  const itemMatches = arrayContent.matchAll(/"([^"]*)"/g);
  
  const result: string[] = [];
  
  for (const match of itemMatches) {
    const fullItem = match[1];
    // 跳过注释行
    if (fullItem.startsWith('//')) continue;
    
    // 移除 "group-" 前缀
    if (fullItem.startsWith('group-')) {
      result.push(fullItem.substring(6));
    }
  }
  
  return result;
}

/**
 * 抓取并更新主分类（一级分类）及其所有子分类（二级分类）
 * @param page Playwright 页面实例
 * @param categoryManager 分类数据管理器
 * @param targetMainCategoryName 可选，指定要抓取的一级分类名称。如果不提供，则抓取所有一级分类。
 */
export const fetch_and_update_main_categories = async (
    categoryUrl: string,
    page: Page,
    categoryManager: CategoryDataManager,
    targetMainCategoryName?: string // 新增参数
): Promise<string> => {
  try {
    console.log(`开始抓取分类页面: ${categoryUrl}`);
    console.log("targetMainCategoryName = ", targetMainCategoryName);

    console.log(`\n--- 开始抓取主分类: ${targetMainCategoryName || "所有分类"} ---`);
    // console.log("--- 开始抓取主分类 (一级分类) ---");
    // const url = "https://www.toolify.ai/category";
    
    await page.goto(categoryUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".category-item");
    await page.waitForTimeout(TIMEOUT_MILLISECONDS);
    await scroll_preload(page);

    const itemElements = await page.locator(".category-item").all();
    console.log(`在页面上找到 ${itemElements.length} 个一级分类项。`);

    let processedCount = 0;

    const htmlContent = await page.content();
    let handles = processDomArray(htmlContent);

    for (const itemEl of itemElements) {
      try {
        const spanEl = itemEl.locator("span").first();
        if (!(await spanEl.count())) {
          console.warn("找到一个没有 <span> 子元素的 .category-item，跳过。");
          continue;
        }
        
        const text = await spanEl.textContent() || "";
        const cleanText = text.replace(/\s+/g, " ").trim();
        if (!cleanText) {
          console.warn("找到一个文本内容为空的一级分类项，跳过。");
          continue;
        }

        // 如果指定了 targetMainCategoryName，则只处理匹配的分类
        if (targetMainCategoryName && cleanText !== targetMainCategoryName) {
          console.log(`跳过一级分类: ${cleanText} (正在寻找: ${targetMainCategoryName})`);
          continue;
        }        
        
        let lastSegment = handles[processedCount+1] || ""; // +1 是因为第一个是 "all"
        console.log(`\n--- 正在处理一级分类: ${cleanText} / ${lastSegment} ---`);

        // 请确保这个函数的导入和签名是正确的
        const { err, items } = await fetch_second_category(page, cleanText);
        if (err) {
            console.warn(`二级分类抓取失败 '${cleanText}':`, err);

            continue; 
        }

        // --- 更新 CategoryDataManager ---
        // 1. 确保一级分类存在
        categoryManager.upsertCategory(cleanText, lastSegment);
        
        // 2. 批量更新或添加二级分类
        // 注意：items 的类型需要与 SecondCategoryItem[] 匹配
        // 如果 fetch_second_category 返回的 items 结构不同，需要进行转换
        if (items && Array.isArray(items)) {
            categoryManager.batchUpsertSecondCategories(cleanText, lastSegment, items);
            console.log(`成功更新一级分类 '${cleanText}' 及其 ${items.length} 个二级分类。`);
        } else {
            console.warn(`一级分类 '${cleanText}' 的二级分类数据无效或为空。`);
        }
        
        processedCount++;

      } catch (e) {
        // 捕获单个分类处理中的错误，避免整个流程中断
        console.error(`处理一级分类元素时出错:`, e);
        // 可以根据需要决定是否继续循环
      }
    }

    console.log(`\n--- 主分类抓取完成 ---`);
    console.log(`总共处理了 ${processedCount} 个一级分类。`);

    return JSON.stringify({ 
        message: "主分类抓取完成", 
        processedMainCategories: processedCount,
        targetedCategory: targetMainCategoryName || "All"
    }, null, 2);

  } catch (error) {
    console.error("fetch_and_update_main_categories 执行出错:", error);
    return JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        targetedCategory: targetMainCategoryName || "All"
    }, null, 2);
  }
};

const fetch_second_category = async (page: Page, name: string): Promise<{ err: string; items: SecondCategoryItem[] }> => {
    let err = "";
    const items: SecondCategoryItem[] = [];
    try {
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
            // items.push({ parentName: name, name: subName, url: fullUrl, count });
            items.push({name: subName, url: fullUrl, count });
        }
    } catch (error) {
        err = error as unknown as string;
        console.error(`Fetch second category error for '${name}':`, err);
    }
    return { err, items };
}

const scroll_preload = async (page: Page): Promise<void> => {
    const maxSteps = 20;
    for (let i = 0; i < maxSteps; i++) {
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
        const atBottom = await page.evaluate(() => (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 2));
        if (atBottom) {
            break;
        }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
};



const fetch_item_detail = async (page: Page, name: string, url: string): Promise<{ err: string; detail: ItemDetail | null }> => {
    let err = "";
    try {
        const detailUrl = toAbsoluteToolifyUrl(url);
        await page.goto(detailUrl, { waitUntil: "domcontentloaded" });
        
        type EvalResult = {
            // name: string;
            // websiteUrl: string;
            // introduction: string;
            addedOn: string;
            monthlyVisitorsValue: number;
            monthlyVisitorsRaw: string;
            socialAndEmail: string[];
            screenshotUrls: string[];
        };
        
        const scraped: EvalResult = await page.evaluate(() => {
            const result = {
                // name: '',
                // websiteUrl: '',
                // introduction: '',
                addedOn: '',
                monthlyVisitorsValue: 0,
                monthlyVisitorsRaw: '',
                socialAndEmail: [] as string[],
                screenshotUrls: [] as string[],
            };
            
            const toText = (el: Element | null): string => {
                if (!el) return '';
                return (el.textContent || '').replace(/\s+/g, ' ').trim();
            };
            
            // Extract tool name from h1 with class tool-name
            // const nameElement = document.querySelector('h1.tool-name');
            // result.name = toText(nameElement) || '';
            
            // Extract website URL from "Open site" button
            // const openSiteButton = document.querySelector('a.to-view-btn[href]');
            // if (openSiteButton) {
            //     result.websiteUrl = (openSiteButton as HTMLAnchorElement).href || '';
            // }
            
            // Extract data from the table structure
            const tableRows = document.querySelectorAll('.table .table-row');
            tableRows.forEach(row => {
                const labelCell = row.querySelector('.table-cell:first-child');
                const valueCell = row.querySelector('.table-cell:last-child');
                
                if (!labelCell || !valueCell) return;
                
                const labelText = toText(labelCell);
                
                switch (labelText) {
                    // case 'Introduction:':
                    //     result.introduction = toText(valueCell);
                    //     break;
                        
                    case 'Added on:':
                        result.addedOn = toText(valueCell);
                        break;
                        
                    case 'Monthly Visitors:':
                        // Extract the visitor count from the span element
                        const visitorSpan = valueCell.querySelector('span');
                        if (visitorSpan) {
                            const visitorText = toText(visitorSpan);
                            result.monthlyVisitorsRaw = visitorText;
                            
                            // Parse the numeric value
                            const match = visitorText.match(/([\d.]+)([KMB]?)/i);
                            if (match) {
                                const value = parseFloat(match[1]);
                                const unit = match[2]?.toUpperCase();
                                
                                if (!isNaN(value)) {
                                    switch (unit) {
                                        case 'K':
                                            result.monthlyVisitorsValue = Math.round(value * 1000);
                                            break;
                                        case 'M':
                                            result.monthlyVisitorsValue = Math.round(value * 1000000);
                                            break;
                                        case 'B':
                                            result.monthlyVisitorsValue = Math.round(value * 1000000000);
                                            break;
                                        default:
                                            result.monthlyVisitorsValue = Math.round(value);
                                    }
                                }
                            }
                        }
                        break;
                        
                    case 'Social & Email:':
                        // Extract all social media and email links
                        const socialLinks = valueCell.querySelectorAll('a[href]');
                        socialLinks.forEach(link => {
                            const href = (link as HTMLAnchorElement).href;
                            if (href) {
                                result.socialAndEmail.push(href);
                            }
                        });
                        break;
                }
            });
            
            // Extract screenshot URLs from tool-pic images
            const screenshotImg = document.querySelector('.tool-pic img');
            if (screenshotImg) {
                const src = (screenshotImg as HTMLImageElement).src;
                if (src) {
                    result.screenshotUrls = [src];
                }
            }
            
            return result;
        });
        
        // const cleanedWebsite: string = cleanWebsiteUrl(scraped.websiteUrl);
        const screenshots: string[] = scraped.screenshotUrls.map(stripImageQueryParams);
        
        const monthlyVisitors: MonthlyVisitors = {
            value: scraped.monthlyVisitorsValue,
            raw: scraped.monthlyVisitorsRaw,
        };
        
        const detail: ItemDetail = {
            // name: scraped.name || name,
            // websiteUrl: cleanedWebsite,
            // introduction: scraped.introduction,
            addedOn: scraped.addedOn,
            monthlyVisitors,
            socialAndEmail: scraped.socialAndEmail,
            screenshotUrls: screenshots,
        };
        
        console.log('--- 抓取到的工具详情 ---');
        // console.log(`[detail] ${detail.name} | ${detail.websiteUrl} | Intro: ${detail.introduction?.slice(0, 80)}`);
        console.log(`[detail] Added on: ${detail.addedOn} | Monthly Visitors: ${detail.monthlyVisitors.raw} (${detail.monthlyVisitors.value})`);
        console.log(`[detail] Social & Email Links: ${detail.socialAndEmail.join(', ')}`);
        console.log(`[detail] Screenshots: ${detail.screenshotUrls.join(', ')}`);
        console.log("\n");
        
        return { err, detail };
    } catch (e) {
        err = (e as Error).message || String(e);
        return { err, detail: null };
    } finally {
        await Promise.race([
            page.goBack({ waitUntil: 'networkidle' }),
            new Promise(resolve => setTimeout(resolve, 5000)) // 5秒超时
        ]);
    }
};