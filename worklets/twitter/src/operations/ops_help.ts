import { createHash } from "crypto";
import { writeFile } from "fs/promises";
import TurndownService from 'turndown';
import { Page } from "playwright";
import fs from 'fs';
import axios from 'axios';
import _ from "lodash";

const isValidHelpUrl = (url: string): boolean => {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'help.x.com' && urlObj.pathname.startsWith('/en/');
    } catch {
        return false;
    }
};

const extractLinksFromSubcategory = (jsonStr: string): string[] => {
    try {
        const data = JSON.parse(jsonStr);
        const links: string[] = [];

        if (data.results && Array.isArray(data.results)) {
            for (const result of data.results) {
                if (result.url) {
                    // Transform URLs from "/content/help-twitter/en/using-x/page.html" 
                    // to "https://help.x.com/en/using-x/page"
                    let transformedUrl = result.url;

                    // Remove "/content/help-twitter" prefix
                    if (transformedUrl.startsWith("/content/help-twitter")) {
                        transformedUrl = transformedUrl.replace("/content/help-twitter", "");
                    }

                    // Remove ".html" suffix
                    if (transformedUrl.endsWith(".html")) {
                        transformedUrl = transformedUrl.replace(".html", "");
                    }

                    const fullUrl = `https://help.x.com${transformedUrl}`;
                    if (isValidHelpUrl(fullUrl)) {
                        links.push(fullUrl);
                    }
                }
            }
        }

        return links;
    } catch (error) {
        console.warn("Failed to parse subcategory JSON:", error);
        return [];
    }
};

const downloadImage = async (dirPath: string, imageUrl: string): Promise<string> => {
    const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
    });

    const imgMd5 = createHash('md5').update(imageUrl).digest('hex');
    const savePath = dirPath + "/" + imgMd5 + ".png";
    fs.writeFileSync(savePath, response.data);
    return imgMd5 + ".png";
}

const fetch_article_and_save = async (page: Page, dirPath: string, link: string): Promise<string> => {
    let err = "";

    // Check if URL is valid X help domain
    if (!isValidHelpUrl(link)) {
        console.warn(`Skipping invalid URL: ${link}`);
        return "";
    }

    for (let i = 0; i < 3; i++) {
        try {
            await page.goto(link);
            await page.waitForSelector("main");
            await page.waitForTimeout(500);

            // Look for title in the page
            const titleElement = await page.$("h1.b01__headline, h1");
            if (!titleElement) {
                console.error(link + " title not found");
                return "";
            }

            let title = await titleElement.evaluate(el => el.textContent.trim());

            // Extract filename from URL path (last segment)
            const urlPath = new URL(link).pathname;
            const filename = urlPath.split('/').pop() || 'unknown-page';
            console.info(`Using filename: ${filename} for URL: ${link}`);

            // Get main content
            let contentElement = await page.$("main");
            if (!contentElement) {
                console.error(link + " main content not found");
                return "";
            }

            // Remove iOS and Android content, keep only desktop content
            await page.evaluate(() => {
                // Remove iOS specific content
                const iosElements = document.querySelectorAll('.ct18__instruction-panel--ios, [data-device-type="ios"]');
                iosElements.forEach(el => el.remove());

                // Remove Android specific content
                const androidElements = document.querySelectorAll('.ct18__instruction-panel--android, [data-device-type="android"]');
                androidElements.forEach(el => el.remove());

                // Remove any remaining mobile/device-specific tabs or selectors
                const deviceTabs = document.querySelectorAll('.ct18__device-tab:not([data-device-type="desktop"])');
                deviceTabs.forEach(el => el.remove());

                // Remove empty instruction containers if all mobile content was removed
                const emptyContainers = document.querySelectorAll('.ct18__instruction-panels-container');
                emptyContainers.forEach(container => {
                    const remainingPanels = container.querySelectorAll('.ct18__instruction-panel');
                    if (remainingPanels.length === 0) {
                        container.remove();
                    }
                });

                // Remove "Share this article" and "Post" sharing elements
                const shareElements = document.querySelectorAll('.b24-share-tweet, .b24__wrapper');
                shareElements.forEach(el => el.remove());

                // Remove "Share this article" headings
                const shareHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
                shareHeadings.forEach(heading => {
                    if (heading.textContent && heading.textContent.trim() === 'Share this article') {
                        heading.remove();
                    }
                });

                // Remove breadcrumbs navigation
                const breadcrumbElements = document.querySelectorAll('.u11__breadcrumbs, .u11');
                breadcrumbElements.forEach(el => el.remove());

                // Remove breadcrumb JSON-LD structured data
                const breadcrumbScripts = document.querySelectorAll('script[type="application/ld+json"]');
                breadcrumbScripts.forEach(script => {
                    try {
                        const data = JSON.parse(script.textContent || '');
                        if (data['@type'] === 'BreadcrumbList') {
                            script.remove();
                        }
                    } catch (e) {
                        // Ignore JSON parsing errors
                    }
                });
            });

            let html = await contentElement.evaluate(el => el.innerHTML);

            // Clean up the HTML and add title
            html = `<h1>${title}</h1>\n${html}`;

            // Convert HTML to markdown
            const turndownService = new TurndownService({
                headingStyle: 'atx',
                bulletListMarker: '-'
            });
            let md = turndownService.turndown(html);
            let newDirPath = dirPath + "/" + filename;
            if (!fs.existsSync(newDirPath)) {
                fs.mkdirSync(newDirPath, { recursive: true });
            }

            // Download images
            const imgElements = await page.$$("main img");
            for (const imgElement of imgElements) {
                try {
                    let img_link = await imgElement.evaluate(el => (el as HTMLImageElement).src);
                    if (img_link && img_link.includes('cdn.cms-twdigitalassets.com')) {
                        console.info("Downloading image: " + img_link);
                        let img_path = await downloadImage(newDirPath, img_link);
                        // Replace the CDN path with local path in markdown
                        const originalPath = img_link.replace("https://cdn.cms-twdigitalassets.com", "");
                        md = md.replace(new RegExp(_.escapeRegExp(originalPath), 'g'), img_path);
                        md = md.replace(new RegExp(_.escapeRegExp(img_link), 'g'), img_path);
                    }
                } catch (imgError) {
                    console.warn("Failed to download image:", imgError);
                }
                await page.waitForTimeout(200);
            }

            await writeFile(newDirPath + "/" + filename + ".md", md, 'utf8');
            console.info(`Successfully saved: ${title}`);
            return "";
        } catch (error) {
            err = error.toString();
            console.warn(`Attempt ${i + 1} failed for ${link}:`, error);
            await page.waitForTimeout(500);
        }
    }

    return err;
}

const extractLinksFromSection = async (page: Page, sectionUrl: string): Promise<string[]> => {
    await page.goto(sectionUrl);
    await page.waitForSelector("main");
    await page.waitForTimeout(1000);

    let links: string[] = [];

    // Check if this page has subcategory sections with JSON data (like using-x page)
    const subcategoryElements = await page.$$('.h03__subcategory[data-json-str]');

    if (subcategoryElements.length > 0) {
        console.info(`Found ${subcategoryElements.length} subcategory sections in ${sectionUrl}`);

        for (const element of subcategoryElements) {
            try {
                const jsonStr = await element.evaluate(el => el.getAttribute('data-json-str'));
                if (jsonStr) {
                    const subcategoryLinks = extractLinksFromSubcategory(jsonStr);
                    links.push(...subcategoryLinks);
                    console.info(`Extracted ${subcategoryLinks.length} links from subcategory`);
                }
            } catch (error) {
                console.warn("Failed to extract links from subcategory:", error);
            }
        }
    } else {
        // For pages without JSON subcategories (like managing-your-account), extract direct links
        const directLinks = await page.$$eval('main a[href*="/en/"]', (elements) => {
            return elements
                .map(link => (link as HTMLAnchorElement).href)
                .filter(href => {
                    // Filter for help article links, excluding navigation and external links
                    return href.includes('help.x.com/en/') &&
                        !href.includes('#') &&
                        !href.includes('/forms.html') &&
                        href !== window.location.href && // Exclude self-reference
                        !href.endsWith('/en/') && // Exclude root pages
                        href.split('/').length > 5; // Ensure it's an article path
                });
        });

        // Transform URLs to remove .html suffix if present
        const transformedLinks = directLinks.map(url => {
            if (url.endsWith('.html')) {
                return url.replace('.html', '');
            }
            return url;
        }).filter(url => isValidHelpUrl(url));

        links.push(...transformedLinks);
        console.info(`Extracted ${transformedLinks.length} direct links from ${sectionUrl}`);
    }

    return links;
};

export const fetch_help_document = async (page: Page, dirPath: string): Promise<string> => {
    try {
        const baseUrl = "https://help.x.com/en";
        console.info(`Starting to crawl X Help documentation from: ${baseUrl}`);

        // Define the main sections to crawl
        const sections = [
            "https://help.x.com/en/managing-your-account",
            "https://help.x.com/en/using-x",
            "https://help.x.com/en/safety-and-security"
        ];

        let allLinks: string[] = [];

        // Extract links from each section
        for (const sectionUrl of sections) {
            console.info(`Crawling section: ${sectionUrl}`);
            try {
                const sectionLinks = await extractLinksFromSection(page, sectionUrl);
                allLinks.push(...sectionLinks);
                console.info(`Section ${sectionUrl.split('/').pop()} contributed ${sectionLinks.length} links`);
            } catch (error) {
                console.warn(`Failed to crawl section ${sectionUrl}:`, error);
            }
        }

        // Remove duplicates
        allLinks = [...new Set(allLinks)];
        console.info(`Total unique links found: ${allLinks.length}`);

        // Fetch each article
        for (let i = 0; i < allLinks.length; i++) {
            const link = allLinks[i];
            console.info(`Processing ${i + 1}/${allLinks.length}: ${link}`);

            try {
                let err = await fetch_article_and_save(page, dirPath, link);
                if (err !== "") {
                    console.error(`Failed to fetch ${link}: ${err}`);
                    // Continue with other links instead of stopping
                }
            } catch (error) {
                console.error(`Error processing ${link}:`, error);
                // Continue with other links
            }

            // Add a small delay between requests
            await page.waitForTimeout(1000);
        }

        console.info("Completed crawling X Help documentation");

    } catch (error) {
        console.error("Error in fetch_help_document:", error);
        return error.toString();
    }

    return "";
}