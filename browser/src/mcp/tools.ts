import { z } from 'zod';
import { executeBrowserAction } from './server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerTools(mcpServer: McpServer): void {
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
      title: "Get Current URL",
      description: "Return the current page URL"
    },
    async () => {
      try {
        const url = await executeBrowserAction("url");
        return {
          content: [{
            type: "text",
            text: String(url)
          }]
        };
      } catch (error) {
        console.error("URL Tool Error:", error);
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
      title: "Visit URL",
      description: "Navigate to a specified URL",
      inputSchema: {
        url: z.string().describe('The URL to navigate to'),
      },
    },
    async (params: any) => {
      try {
        const url = params?.url;
        if (!url) {
          throw new Error("URL parameter is required");
        }
        
        await executeBrowserAction("visit", { url });
        
        return {
          content: [{
            type: "text",
            text: `Successfully navigated to ${url}`
          }]
        };
      } catch (error) {
        console.error("Visit Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error visiting URL: ${error.message}`
          }]
        };
      }
    }
  );
}