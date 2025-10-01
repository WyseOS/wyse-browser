import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BrowserAction} from '../action';
import { defineTabTool } from './define';
import { z } from 'zod';
import { Context } from './context';

const browserAction = new BrowserAction();

// Create MCP server instance
export const mcpServer = new McpServer({
  name: 'wyse-browser-mcp',
  version: '0.1.0',
});

// Register a tool
mcpServer.registerTool(
  "helloworld",
  {
    title: "Hello World",
    description: "Prints Hello World"
  },
  async () => ({
    content: [{
      type: "text",
      text: String("Hello World")
    }]
  })
);


import { Runtime } from '../runtime';
import { MetadataType } from '../constants';
import { SessionContext } from '../session_context';
import { v4 as uuidv4 } from 'uuid';

mcpServer.registerTool(
  "url",
  {
    title: "action-url",
    description: "Return the current page URL"
  },
  async () => {
    try {
        // if (!browserAction) {
        //     throw new Error("BrowserAction not initialized with page context");
        // }

        
        let sessionContext = SessionContext.Default();
        const newSessionId = uuidv4();

        let runtime = new Runtime();

        await runtime.createSession(sessionContext, newSessionId);

        console.log("newSessionId: " + newSessionId);

        const session = runtime.getSession(newSessionId);


        // let action = await runtime.getSession(newSessionId);
        // let instance = runtime.

        const browserAction = new BrowserAction();

        const url = await browserAction.action(session, 0, "url", {})

        return {
          content: [{
            type: "text",
            text: String(url)
          }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving URL: ${error.message}`
        }]
      };
    }
  }
);


mcpServer.registerTool(
  "visit",
  {
    title: "action_visit",
    description: "visit page URL"
  },
  async () => {
    try {
        // if (!browserAction) {
        //     throw new Error("BrowserAction not initialized with page context");
        // }

        
        let sessionContext = SessionContext.Default();
        const newSessionId = uuidv4();

        let runtime = new Runtime();

        await runtime.createSession(sessionContext, newSessionId);

        console.log("newSessionId: " + newSessionId);

        const session = runtime.getSession(newSessionId);


        // let action = await runtime.getSession(newSessionId);
        // let instance = runtime.

        const browserAction = new BrowserAction();

        const url = await browserAction.action(session, 0, "visit", {"url": "https://www.baidu.com"})

        return {
          content: [{
            type: "text",
            text: String(url)
          }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving URL: ${error.message}`
        }]
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
  console.error("MCP server is running...");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});