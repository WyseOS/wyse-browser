import * as fs from "fs";
import path from "path";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { FOLDER_DESTINATION } from "./constants";
import { IWorklet } from "../../../browser/src/interfaces/iworklet";
import { Session } from "../../../browser/src/session";
import { start_from_category, start_from_specific_category, fetch_and_update_main_categories } from "./operations/fetch_toolify_category";
import { IncrementalToolDataManager } from "./operations/tool_data_manager";
import { CategoryDataManager } from "./operations/catagory_manager";

chromium.use(stealth());

export class Crawler implements IWorklet {
	private name: string;
	private version: string;
	private session: Session;
	private properties: Map<string, string | number> = new Map();

	initialize(session: Session, properties: Map<string, string | number>): void {
		const manifest = JSON.parse(fs.readFileSync(path.resolve('../../', "configs/worklets/crawler", "manifest.json"), "utf8"));
		this.name = manifest.name;
		this.version = manifest.version;
		this.session = session;
		this.properties = properties;
		console.log(`Worklet ${this.name} initialized`);
	}

	getName(): string {
		return this.name;
	}

	getVersion(): string {
		return this.version;
	}

	async execute(command: string, ...args: any[]): Promise<string> {
		// const dataManager = new IncrementalToolDataManager("./data", false, 'base_chinese.json');
        // const categoryManager = new CategoryDataManager('./data/categories_chinese.json');

        let language = this.properties.get('language') || 'zh';


        const baseFileName = language === 'en' ? 'base.json' : 'base_chinese.json';
        const categoriesFileName = language === 'en' ? 'categories.json' : 'categories_chinese.json';
        const baseUrl = language === 'en' ? 'https://www.toolify.ai' : 'https://www.toolify.ai/zh';
        const categoryUrl = language === 'en' ? 'https://www.toolify.ai/category' : 'https://www.toolify.ai/zh/category';

        console.log(`Using language: ${language}, base file: ${baseFileName}, categories file: ${categoriesFileName}, categoryUrl: ${categoryUrl}`);
        
        const dataManager = new IncrementalToolDataManager("./data", false, baseFileName);
        const categoryManager = new CategoryDataManager(`./data/${categoriesFileName}`);

	    const page = await this.session.getDefaultPage();

        if (command === 'all') {
            console.log("--- 开始全量抓取 ---");
            const result = await start_from_category(categoryUrl, page, categoryManager, dataManager);
            console.log("全量抓取结果:", result);

        } else if (command === 'specific') {
            const parentCategory = args[1];
            const secondCategory = args[2];

            if (!parentCategory) {
                console.error("使用 'specific' 命令时，必须提供一级分类名称。");
                console.error("用法: ts-node src/cmd.ts specific <parentCategoryName> [secondCategoryName]");
                process.exit(1);
            }

            console.log(`--- 开始抓取指定分类: ${parentCategory} ${secondCategory ? '-> ' + secondCategory : '(所有子分类)'} ---`);
            const result = await start_from_specific_category(baseUrl, page, categoryManager, dataManager, parentCategory, secondCategory);
            console.log("指定分类抓取结果:", result);

        } else if (command === 'specific-batch') {
            const targetCategories = args.slice(1);
            if (targetCategories.length === 0) {
                console.error("使用 'specific-batch' 命令时，必须提供至少一个一级分类名称。");
                console.error("用法: ts-node src/cmd.ts specific-batch \"Category A\" \"Category B\" ...");
                process.exit(1);
            }

            console.log(`--- 开始串行抓取 ${targetCategories.length} 个指定的一级分类 ---`);
            
            let successCount = 0;
            let failCount = 0;

            // 使用 for...of 循环串行执行
            for (const categoryName of targetCategories) {
                try {
                    console.log(`\n--- [${successCount + failCount + 1}/${targetCategories.length}] 开始抓取: ${categoryName} ---`);
                    
                    // 调用现有的 start_from_specific_category 函数
                    // 注意：这个函数的第四个参数是可选的 secondCategoryName，我们不传，表示抓取该一级分类下的所有二级分类
                    const resultJson = await start_from_specific_category(baseUrl, page, categoryManager, dataManager, categoryName);
                    
                    // 尝试解析结果以检查是否有错误
                    let result;
                    try {
                        result = JSON.parse(resultJson);
                    } catch (parseErr) {
                        console.warn(`无法解析 ${categoryName} 的返回结果:`, resultJson);
                        result = { message: "Unknown result format" };
                    }

                    if (result.error) {
                        console.error(`❌ 抓取分类 '${categoryName}' 失败:`, result.error);
                        failCount++;
                    } else {
                        console.log(`✅ 成功抓取分类 '${categoryName}':`, result.message || "完成");
                        successCount++;
                    }
                } catch (err) {
                    console.error(`❌ 执行分类 '${categoryName}' 时发生未捕获异常:`, err);
                    failCount++;
                    // 可以选择在这里 continue 继续下一个，或者 break 停止整个批次
                    continue; 
                }
            }

            console.log(`\n--- 串行批量抓取完成 ---`);
            console.log(`成功: ${successCount}, 失败: ${failCount}, 总计: ${targetCategories.length}`);
            
        } else if (command === 'categories') {
            const targetMainCategory = args[1]; // 可选参数

            if (targetMainCategory) {
                console.log(`--- 开始抓取并更新指定主分类: ${targetMainCategory} ---`);
                const result = await fetch_and_update_main_categories(categoryUrl, page, categoryManager, targetMainCategory);
                console.log("指定主分类抓取结果:", result);
            } else {
                console.log("--- 开始抓取并更新所有主分类 ---");
                const result = await fetch_and_update_main_categories(categoryUrl, page, categoryManager);
                console.log("所有主分类抓取结果:", result);
            }
        } else {
            console.error(`未知命令: ${command}`);
            console.error("可用命令: all, specific");
            process.exit(1);
        }

		// switch (actionName) {
		// case 'toolify':
		// 	const dataManager = new IncrementalToolDataManager("./data", false);
		// 	const categoryManager = new CategoryDataManager('./data/categories.json');

		// 	return this.fetch_from_category(categoryManager, dataManager);
		// default:
		// 	throw new Error(`Unknown action: ${actionName}`);
		// }

		return "Execution completed";
  }

	dispose(): void {
		console.log(`Worklet ${this.name} disposed`);
	}

	// async fetch_from_category(categoryManager: CategoryDataManager, dataManager: IncrementalToolDataManager): Promise<string> {
	// 	console.log("fetch from Toolify category");
	// 	const page = await this.session.getDefaultPage();
	// 	// const output = await start_from_category(page, categoryManager, dataManager);
	// 	const output = await start_from_specific_category(page, categoryManager, dataManager, "Image Generation & Editing");
	// 	return output;
	// }
}