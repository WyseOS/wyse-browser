import { Crawler } from "./crawler";
import { Session } from "../../../browser/src/session";
import { SessionContext } from "../../../browser/src/session_context";

async function main() {
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
        await crawler.execute("toolify");
    } catch (err) {
        console.error("Error running crawler:", err);
    } finally {
        await session.dispose();
    }
}

main();