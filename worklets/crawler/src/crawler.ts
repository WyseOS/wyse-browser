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
		const dataManager = new IncrementalToolDataManager("./data", false);
        const categoryManager = new CategoryDataManager('./data/categories.json');

	    const page = await this.session.getDefaultPage();

        if (command === 'all') {
            console.log("--- 开始全量抓取 ---");
            const result = await start_from_category(page, categoryManager, dataManager);
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
            const result = await start_from_specific_category(page, categoryManager, dataManager, parentCategory, secondCategory);
            console.log("指定分类抓取结果:", result);

        } else if (command === 'categories') {
            const targetMainCategory = args[1]; // 可选参数

            if (targetMainCategory) {
                console.log(`--- 开始抓取并更新指定主分类: ${targetMainCategory} ---`);
                const result = await fetch_and_update_main_categories(page, categoryManager, targetMainCategory);
                console.log("指定主分类抓取结果:", result);
            } else {
                console.log("--- 开始抓取并更新所有主分类 ---");
                const result = await fetch_and_update_main_categories(page, categoryManager);
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