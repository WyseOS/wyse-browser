import _ from "lodash";
import { Page, Locator } from "@playwright/test";
import { cleanWebsiteUrl, formatCompactNumber, stripImageQueryParams } from './utils';
//import { z } from "zod";
import { TIMEOUT_MILLISECONDS } from "../constants";
import { ToolifyCategoryOutputSchema } from "../schemas";
import { IncrementalToolDataManager, ToolData } from "./tool_data_manager";

interface SecondCategoryItem {
    parentName: string;
    name: string;
    url: string;
    count: number;
}

interface ToolItem {
    toolUrl: string;
    logoUrl: string;
    title: string;
    description: string;
    websiteUrl: string;
}

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
    name: string;
    websiteUrl: string;
    introduction: string;
    addedOn: string;
    monthlyVisitors: MonthlyVisitors;
    socialAndEmail: string;
    screenshotUrls: string[];
    productInformation: ProductInformation;
    faq: FaqItem[];
    discordUrl: string;
    companyName: string;
    loginUrl: string;
    signUpUrl: string;
    pricingUrl: string;
    facebookUrl: string;
    twitterUrl: string;
    githubUrl: string;
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



const fetch_item_detail = async (page: Page, name: string, url: string): Promise<{ err: string; detail: ItemDetail | null }> => {
    let err = "";
    try {
        const detailUrl = toAbsoluteToolifyUrl(url);
        await page.goto(detailUrl, { waitUntil: "domcontentloaded" });
        type EvalResult = {
            name: string;
            websiteUrl: string;
            introduction: string;
            addedOn: string;
            monthlyVisitorsValue: number;
            socialAndEmail: string;
            screenshotUrls: string[];
            productInformation: ProductInformation;
            faq: FaqItem[];
            discordUrl: string;
            companyName: string;
            loginUrl: string;
            signUpUrl: string;
            pricingUrl: string;
            facebookUrl: string;
            twitterUrl: string;
            githubUrl: string;
        };
        const scraped: EvalResult = await page.evaluate(() => {
            const result = {
                name: '',
                websiteUrl: '',
                introduction: '',
                addedOn: '',
                monthlyVisitorsValue: 0,
                socialAndEmail: '',
                screenshotUrls: [] as string[],
                productInformation: {
                    whatIs: '',
                    howToUse: '',
                    coreFeatures: [] as string[],
                    useCases: [] as string[],
                },
                faq: [] as { question: string; answer: string }[],
                discordUrl: '',
                companyName: '',
                loginUrl: '',
                signUpUrl: '',
                pricingUrl: '',
                facebookUrl: '',
                twitterUrl: '',
                githubUrl: '',
            };
            const toText = (el: Element | null): string => (el?.textContent || '').replace(/\s+/g, ' ').trim();
            const isUrl = (s: unknown): s is string => typeof s === 'string' && /^https?:\/\//i.test(s);
            const urlsFromDom = Array.from(document.querySelectorAll('a'))
                .map(a => ({ href: (a as HTMLAnchorElement).href || '', text: toText(a) }))
                .filter(x => isUrl(x.href));
            const pullUrlByText = (pattern: RegExp): string => {
                const found = urlsFromDom.find(u => pattern.test(u.text) || pattern.test(u.href));
                return found?.href || '';
            };
            const metaContent = (name: string): string => {
                const m = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
                return m?.content || '';
            };
            const collected: any = {
                website: '',
                image: '',
                what_is: '',
                how_to_use: '',
                coreFeaturesList: [] as string[],
                useCasesList: [] as string[],
                faq: [] as { q: string; a: string }[],
                added_on: '',
                company_name: '',
                traffic: null as null | Record<string, any>,
                social_email_text: '',
                title: '',
            };
            const walk = (obj: unknown) => {
                if (!obj || typeof obj !== 'object') return;
                const anyObj = obj as Record<string, unknown>;
                if (!collected.website && typeof anyObj['website'] === 'string') collected.website = anyObj['website'];
                if (!collected.image && typeof anyObj['image'] === 'string') collected.image = anyObj['image'];
                if (!collected.title && typeof anyObj['website_name'] === 'string') collected.title = anyObj['website_name'];
                const ai = anyObj['ai_content'] as Record<string, unknown> | undefined;
                if (ai && typeof ai === 'object') {
                    if (!collected.what_is && typeof ai['what_is'] === 'string') collected.what_is = ai['what_is'] as string;
                    if (!collected.how_to_use && typeof ai['how_to_use'] === 'string') collected.how_to_use = ai['how_to_use'] as string;
                    const cf = (ai['coreFeaturesList'] || ai['core_features'] || ai['core_features_list']) as unknown;
                    if (Array.isArray(cf)) {
                        const flat: string[] = [];
                        (cf as any[]).forEach((row) => {
                            if (Array.isArray(row)) row.forEach((x) => { if (typeof x === 'string') flat.push(x); });
                            else if (typeof row === 'string') flat.push(row);
                        });
                        if (flat.length) collected.coreFeaturesList = flat;
                    }
                    const uc = (ai['use_cases'] || ai['useCasesList']) as unknown;
                    if (Array.isArray(uc)) {
                        const flat: string[] = [];
                        (uc as any[]).forEach((x) => { if (typeof x === 'string') flat.push(x); });
                        if (flat.length) collected.useCasesList = flat;
                    }
                    const faq = ai['faq'] as unknown;
                    if (Array.isArray(faq)) {
                        const mapped = (faq as any[]).map((f) => ({
                            q: typeof f?.q === 'string' ? f.q as string : '',
                            a: typeof f?.a === 'string' ? f.a as string : '',
                        })).filter(x => x.q || x.a);
                        if (mapped.length) collected.faq = mapped;
                    }
                }
                if (!collected.traffic && anyObj['traffic'] && typeof anyObj['traffic'] === 'object') {
                    collected.traffic = anyObj['traffic'] as Record<string, any>;
                }
                if (!collected.company_name && typeof anyObj['company_name'] === 'string') collected.company_name = anyObj['company_name'];
                if (!collected.added_on && typeof anyObj['added_on'] === 'string') collected.added_on = anyObj['added_on'];
                if (!collected.social_email_text && typeof anyObj['social_email_text'] === 'string') collected.social_email_text = anyObj['social_email_text'];
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
            result.name = collected.title || toText(document.querySelector('h1')) || name;
            result.websiteUrl = typeof collected.website === 'string' ? collected.website : '';
            if (!result.websiteUrl) {
                const visit = urlsFromDom.find(u => /visit website/i.test(u.text));
                if (visit) result.websiteUrl = visit.href;
            }
            result.introduction = collected.what_is || toText(document.querySelector('.intro, .introduction, [data-section="introduction"]'));
            result.addedOn = collected.added_on || metaContent('article:published_time') || metaContent('date') || '';
            if (collected.traffic && typeof collected.traffic === 'object') {
                const t = collected.traffic as Record<string, any>;
                const keys = [
                    'monthly_visits_mail',
                    'monthly_visits_direct',
                    'monthly_visits_search',
                    'monthly_visits_social',
                    'monthly_visits_referrals',
                    'monthly_visits_paid_referrals',
                ];
                const total = keys.reduce((acc, k) => acc + (Number(t[k]) || 0), 0);
                if (total > 0) result.monthlyVisitorsValue = Math.round(total);
            }
            result.socialAndEmail = collected.social_email_text || toText(document.querySelector('.social-email, [data-section="social-email"]'));
            const imgCandidates: string[] = [];
            if (isUrl(collected.image)) imgCandidates.push(collected.image);
            const ogImg = (document.head.querySelector('meta[name="og:image"], meta[property="og:image"]') as HTMLMetaElement | null)?.content || '';
            if (isUrl(ogImg)) imgCandidates.push(ogImg);
            document.querySelectorAll('img').forEach(img => {
                const src = (img as HTMLImageElement).src || '';
                if (isUrl(src) && /cdn-images\.toolify\./i.test(src)) imgCandidates.push(src);
            });
            result.screenshotUrls = Array.from(new Set(imgCandidates));
            result.productInformation.whatIs = collected.what_is || '';
            result.productInformation.howToUse = collected.how_to_use || '';
            result.productInformation.coreFeatures = collected.coreFeaturesList || [];
            result.productInformation.useCases = collected.useCasesList || [];
            result.faq = (collected.faq || []).map((f: any) => ({ question: f.q, answer: f.a }));
            const byHost = (hostPattern: RegExp): string => (urlsFromDom.find(u => {
                try { return hostPattern.test(new URL(u.href).host); } catch { return false; }
            })?.href || '');
            result.facebookUrl = byHost(/facebook\.com/i);
            result.twitterUrl = byHost(/(twitter\.com|x\.com)/i);
            result.githubUrl = byHost(/github\.com/i);
            result.discordUrl = byHost(/discord\.(gg|com)/i);
            result.pricingUrl = pullUrlByText(/pricing/i);
            result.loginUrl = pullUrlByText(/login|sign\s?in/i);
            result.signUpUrl = pullUrlByText(/sign\s?up|register/i);
            result.companyName = collected.company_name || toText(document.querySelector('.company-name, [data-section="company"]'));
            return result;
        });
        const cleanedWebsite: string = cleanWebsiteUrl(scraped.websiteUrl);
        const screenshots: string[] = scraped.screenshotUrls.map(stripImageQueryParams);
        const monthlyVisitors: MonthlyVisitors = {
            value: scraped.monthlyVisitorsValue,
            raw: formatCompactNumber(scraped.monthlyVisitorsValue),
        };
        const detail: ItemDetail = {
            name: scraped.name || name,
            websiteUrl: cleanedWebsite,
            introduction: scraped.introduction,
            addedOn: scraped.addedOn,
            monthlyVisitors,
            socialAndEmail: scraped.socialAndEmail,
            screenshotUrls: screenshots,
            productInformation: scraped.productInformation,
            faq: scraped.faq,
            discordUrl: scraped.discordUrl,
            companyName: scraped.companyName,
            loginUrl: scraped.loginUrl ? cleanWebsiteUrl(scraped.loginUrl) : '',
            signUpUrl: scraped.signUpUrl ? cleanWebsiteUrl(scraped.signUpUrl) : '',
            pricingUrl: scraped.pricingUrl ? cleanWebsiteUrl(scraped.pricingUrl) : '',
            facebookUrl: scraped.facebookUrl,
            twitterUrl: scraped.twitterUrl,
            githubUrl: scraped.githubUrl,
        };
        console.log(`[detail] ${detail.name} | ${detail.websiteUrl} | Intro: ${detail.introduction?.slice(0, 80)}`);
        console.log(`[detail] Added on: ${detail.addedOn} | Monthly Visitors: ${detail.monthlyVisitors.raw} (${detail.monthlyVisitors.value}) | Social & Email: ${detail.socialAndEmail}`);
        console.log(`[detail] Links: discord=${detail.discordUrl} company=${detail.companyName} login=${detail.loginUrl} signup=${detail.signUpUrl} pricing=${detail.pricingUrl}`);
        console.log(`[detail] Social: fb=${detail.facebookUrl} tw=${detail.twitterUrl} gh=${detail.githubUrl}`);
        console.log(`[detail] Screenshots: ${detail.screenshotUrls.join(', ')}`);
        return { err, detail };
    } catch (e) {
        err = (e as Error).message || String(e);
        return { err, detail: null };
    }
};

export const start_from_category = async (page: Page, dataManager: IncrementalToolDataManager): Promise<string> => {
  try {
    // 1. 获取所有二级分类
    const url = "https://www.toolify.ai/category";
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".category-item");
    await page.waitForTimeout(TIMEOUT_MILLISECONDS);
    await scroll_preload(page);

    const itemElements = await page.locator(".category-item").all();
    const results: SecondCategoryItem[] = [];
    
    for (const itemEl of itemElements) {
      try {
        const spanEl = itemEl.locator("span").first();
        if (!(await spanEl.count())) continue;
        
        const text = await spanEl.textContent() || "";
        const cleanText = text.replace(/\s+/g, " ").trim();
        if (!cleanText) continue;

        const { err, items } = await fetch_second_category(page, cleanText);
        if (err) console.warn(`二级分类抓取失败 '${cleanText}':`, err);
        results.push(...items);
      } catch (e) {
        console.error(`元素处理错误 '${url}':`, e);
      }
    }

    console.info(`二级分类总数: ${results.length}`);

    let allCategorys = [];
    // for (const category of results) {
    for (let i = 0; i < 2; i++) {
    // for (let i = 0; i < results.length; i++) {
        const category = results[i];

        console.log("Tools in Category: ", category);

        const newTools = await scrapeCategoryTools(page, category.url);
        // allCategorys.push({ category, tools });

        // dataManager.batchUpsertTools(category.parentName, tools, true);  
        // dataManager.saveToFile();

        // 批量添加新工具（自动判断是否已存在）
        const addedCount = dataManager.batchUpsertTools(
            category.parentName,
            category.name, 
            newTools
        );

        console.log(`新增了 ${addedCount} 个工具`);
    }

    return JSON.stringify(allCategorys, null, 2);
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2);
  }
};

// Playwright 实现的工具抓取
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
          const titleAnchor = card.querySelector('.card-text-content a[href^="/tool/"]') as HTMLAnchorElement | null;
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
        
        tools.push({
          toolUrl: c.toolUrl,
          logoUrl: logoUrl,
          title: c.title,
          description: c.description,
          website: cleanedWebsite
        });
        
        console.log(`tool: ${c.toolUrl}, logo: ${logoUrl}, title: ${c.title}, description: ${c.description}, website: ${cleanedWebsite}`);


        // TODO: 8.31
        // TODO:: 暂时注释掉详情页抓取，避免频繁请求
        // try {
        //     const { err: dErr } = await fetch_item_detail(page, c.title, c.toolUrl);
        //     if (dErr) {
        //         console.warn(`[detail] fetch failed for ${c.toolUrl}: ${dErr}`);
        //     }
        // } catch (e) {
        //     console.warn(`[detail] exception for ${c.toolUrl}:`, e);
        // }

      } catch (e) {
        console.error('工具卡片解析失败:', e);
      }
    }

    // 改进的翻页逻辑
    const nextPageLink = await page.$(`.tools-pagination a[href*="page=${currentPage + 1}"]:not([disabled])`);
    
    if (nextPageLink) {
      currentPage++;
      await Promise.all([
        nextPageLink.click(),
        page.waitForLoadState('networkidle'),
        page.waitForSelector('.tool-item', { timeout: 10000 })
      ]);
      await page.waitForTimeout(1000); // 额外等待1秒确保稳定
    } else {
      // 检查是否有下一页箭头按钮（且未被禁用）
      const nextArrowBtn = await page.$('.tools-pagination a:has(> svg.svg-icon.text-sm):not([disabled])');
      if (nextArrowBtn) {
        currentPage++;
        await Promise.all([
          nextArrowBtn.click(),
          page.waitForLoadState('networkidle'),
          page.waitForSelector('.tool-item', { timeout: 10000 })
        ]);
        await page.waitForTimeout(1000);
      } else {
        break; // 没有下一页了
      }
    }
  }

  return tools;
}

const fetch_items_in_category = async (page: Page, parentName: string, name: string, url: string, count: number): Promise<{ err: string; items: ToolItem[] }> => {
    let err = "";
    const items: ToolItem[] = [];
    try {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.waitForSelector('.tools .tool-item', { timeout: 10000 });
        const { cards, logoMap } = await page.evaluate(() => {
            const toText = (el: Element | null): string => (el?.textContent || '').replace(/\s+/g, ' ').trim();
            const containers = Array.from(document.querySelectorAll('.tools'));
            const cards: { toolUrl: string; title: string; description: string; websiteUrl: string; imgSrc: string }[] = [];
            containers.forEach(c => {
                const toolCards = Array.from(c.querySelectorAll('.tool-item .tool-card'));
                toolCards.forEach(card => {
                    const titleAnchor = card.querySelector('.card-text-content a[href^="/tool/"]') as HTMLAnchorElement | null;
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
        for (const c of cards) {
            const match = c.toolUrl.match(/\/tool\/([^\/?#]+)/);
            const handle = match?.[1] || '';
            const logoFromNuxt = handle ? logoMap[handle] : '';
            const logoUrl = logoFromNuxt || toAbsolute(c.imgSrc);
            const cleanedWebsite = cleanWebsiteUrl(c.websiteUrl);
            items.push({ toolUrl: c.toolUrl, logoUrl, title: c.title, description: c.description, websiteUrl: cleanedWebsite });
            console.log(`tool: ${c.toolUrl}, logo: ${logoUrl}, title: ${c.title}, description: ${c.description}, website: ${cleanedWebsite}, parent: ${parentName}, name: ${name}, url: ${url}, total: ${count}`);
            try {
                const { err: dErr } = await fetch_item_detail(page, c.title || name, c.toolUrl);
                if (dErr) {
                    console.warn(`[detail] fetch failed for ${c.toolUrl}: ${dErr}`);
                }
            } catch (e) {
                console.warn(`[detail] exception for ${c.toolUrl}:`, e);
            }
        }
    } catch (e) {
        err = e as unknown as string;
    }
    return { err, items };
}

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
            items.push({ parentName: name, name: subName, url: fullUrl, count });
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

// export const start_from_category = async (page: Page): Promise<string> => {
//     try {
//         const url = "https://www.toolify.ai/category";
//         await page.goto(url, { waitUntil: "domcontentloaded" });
//         await page.waitForSelector(".category-item");
//         await page.waitForTimeout(TIMEOUT_MILLISECONDS);
//         await scroll_preload(page);

//         const itemElements = await page.$$(".category-item");
//         const results: SecondCategoryItem[] = [];
//         for (const itemEl of itemElements) {
//             try {
//                 const spanEl = await itemEl.$("span");
//                 if (!spanEl) {
//                     continue;
//                 }
//                 const text = await spanEl.evaluate((el: Element) => (el.textContent || "").replace(/\s+/g, " ").trim());
//                 if (!text) continue;
//                 const { err, items } = await fetch_second_category(page, text);
//                 if (err) {
//                     console.warn(`Fetch second category failed for '${text}':`, err);
//                 }
//                 results.push(...items);
//             } catch (e) {
//                 console.error(`Fetch item error for '${url}':`, e);
//                 continue;
//             }
//         }
//         console.info(`second-level total: ${results.length}`);

//         const [r] = results ?? []
//         if (r) {
//         // for (const r of results) {
//             // console.info(`parent: ${r.parentName}, url: ${r.url}, name: ${r.name}, count: ${r.count}`);
//             console.info("r = ", r);

//             await fetch_items_in_category(page, r.parentName, r.name, r.url, r.count);
//         }
//         return JSON.stringify("{}", null, 2);
//     } catch (error) {
//         return error as unknown as string;
//     }
// };