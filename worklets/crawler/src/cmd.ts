import { Crawler } from "./crawler";
import { Session } from "../../../browser/src/session";
import { SessionContext } from "../../../browser/src/session_context";

async function main() {
    const args = process.argv.slice(2); // 获取命令行参数 (排除 node 和脚本名)
    const command = args[0]; // 第一个参数作为命令

    console.log("Starting crawler with command:", command, "and args:", args.slice(1));

    if (!command) {
        console.error("请提供命令。用法: ts-node src/cmd.ts <command> [options]");
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