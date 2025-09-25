import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BrowserAction} from '../action';
import { Page } from 'playwright';

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

mcpServer.registerTool(
  "url",
  {
    title: "action-url",
    description: "Return the current page URL"
  },
  async (page) => {
    try {
        const url = await browserAction.action_url(page);
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