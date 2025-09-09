import { Crawler } from "./crawler";
import { Session } from "../../../browser/src/session";
import { SessionContext } from "../../../browser/src/session_context";

async function main() {
    const args = process.argv.slice(2); // 获取命令行参数 (排除 node 和脚本名)
    let command = args[0]; // 第一个参数作为命令
    let language = 'zh'; // 默认为中文
    
    // 检查是否指定了语言参数
    if (command === '--lang' || command === '-l') {
        if (args[1]) {
            language = args[1].toLowerCase() === 'en' ? 'en' : 'zh';
            command = args[2];
            args.splice(0, 2); // 移除语言参数
        }
    }

    console.log("Starting crawler with command:", command, "and args:", args.slice(1), "language:", language);

    if (!command) {
        console.error("请提供命令。用法: ts-node src/cmd.ts [options] <command> [options]");
        console.error("选项:");
        console.error("  -l, --lang <zh|en>      - 指定语言 (默认: zh)");
        console.error("可用命令:");
        console.error("  all                     - 抓取所有分类");
        console.error("  specific <parent> [child] - 抓取指定分类 (例如: 'Writing & Editing' 或 'Writing & Editing' 'AI Book Writing')");
        console.error("  categories [main]       - 抓取并更新主分类 (例如: 'categories' 抓取所有, 'categories \"Writing & Editing\"' 抓取指定主分类)");
        console.error("  specific-batch <cat1> [cat2] [cat3] ... - 串行抓取多个指定的一级分类 (例如: 'specific-batch \"Writing & Editing\" \"Image Generation & Editing\"')");
        process.exit(1);
    }

    const crawler = new Crawler();
    const session = new Session();
    const properties = new Map<string, string | number>();
    
    // 将语言设置传递给 crawler
    properties.set('language', language);

    crawler.initialize(session, properties);

    const context = SessionContext.Default();
    const sessionId = await session.initialize(
        "", // session_id
        context,
        15000, // timeout ms
        1440, // width
        900, // height
        false, // headless
        "http://localhost", // page_devtool_frontend_host
        "ws://localhost" // page_devtool_ws_host
    );
    await session.waitForInitialization();

    try {
        await crawler.execute(command, ...args);
    } catch (err) {
        console.error("Error running crawler:", err);
    } finally {
        await session.dispose();
    }
}

main();