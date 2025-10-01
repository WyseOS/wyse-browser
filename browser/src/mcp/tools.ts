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

  // History Tool
  mcpServer.registerTool(
    "history",
    {
      title: "Navigate History",
      description: "Navigate through browser history (forward or backward)",
      inputSchema: {
        num: z.number().int().describe('Number of steps to navigate. Positive for forward, negative for backward')
      }
    },
    async (params: any) => {
      try {
        const num = params?.num;
        if (num === undefined) {
          throw new Error("num parameter is required");
        }
        
        await executeBrowserAction("history", { num });
        
        const direction = num > 0 ? "forward" : num < 0 ? "backward" : "no change";
        return {
          content: [{
            type: "text",
            text: `Successfully navigated ${Math.abs(num)} steps ${direction} in history`
          }]
        };
      } catch (error) {
        console.error("History Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error navigating history: ${error.message}`
          }]
        };
      }
    }
  );

  // Search Tool
  mcpServer.registerTool(
    "search",
    {
      title: "Search on Google",
      description: "Perform a Google search with the specified keywords",
      inputSchema: {
        search_key: z.string().describe('The search keywords')
      }
    },
    async (params: any) => {
      try {
        const searchKey = params?.search_key;
        if (!searchKey) {
          throw new Error("search_key parameter is required");
        }
        
        await executeBrowserAction("search", { search_key: searchKey });
        
        return {
          content: [{
            type: "text",
            text: `Successfully searched for: ${searchKey}`
          }]
        };
      } catch (error) {
        console.error("Search Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error performing search: ${error.message}`
          }]
        };
      }
    }
  );

  // Refresh Tool
  mcpServer.registerTool(
    "refresh_page",
    {
      title: "Refresh Page",
      description: "Refresh the current page"
    },
    async () => {
      try {
        await executeBrowserAction("refresh_page");
        
        return {
          content: [{
            type: "text",
            text: "Successfully refreshed the page"
          }]
        };
      } catch (error) {
        console.error("Refresh Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error refreshing page: ${error.message}`
          }]
        };
      }
    }
  );

  // Click Tool
  mcpServer.registerTool(
    "click",
    {
      title: "Click Element",
      description: "Click on an element either by element_id or coordinates",
      inputSchema: {
        element_id: z.string().optional().describe('The element ID to click'),
        x: z.number().optional().describe('X coordinate for click'),
        y: z.number().optional().describe('Y coordinate for click')
      }
    },
    async (params: any) => {
      try {
        if (!params?.element_id && (params?.x === undefined || params?.y === undefined)) {
          throw new Error("Either element_id or both x and y coordinates must be provided");
        }
        
        await executeBrowserAction("click", params);
        
        let message = "Successfully clicked ";
        if (params.element_id) {
          message += `element with ID: ${params.element_id}`;
        } else {
          message += `at coordinates (${params.x}, ${params.y})`;
        }
        
        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        console.error("Click Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error clicking element: ${error.message}`
          }]
        };
      }
    }
  );

  // Double Click Tool
  mcpServer.registerTool(
    "double_click",
    {
      title: "Double Click Element",
      description: "Double click on an element either by element_id or coordinates",
      inputSchema: {
        element_id: z.string().optional().describe('The element ID to double click'),
        x: z.number().optional().describe('X coordinate for double click'),
        y: z.number().optional().describe('Y coordinate for double click')
      }
    },
    async (params: any) => {
      try {
        if (!params?.element_id && (params?.x === undefined || params?.y === undefined)) {
          throw new Error("Either element_id or both x and y coordinates must be provided");
        }
        
        await executeBrowserAction("double_click", params);
        
        let message = "Successfully double clicked ";
        if (params.element_id) {
          message += `element with ID: ${params.element_id}`;
        } else {
          message += `at coordinates (${params.x}, ${params.y})`;
        }
        
        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        console.error("Double Click Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error double clicking element: ${error.message}`
          }]
        };
      }
    }
  );

  // Text Input Tool
  mcpServer.registerTool(
    "text",
    {
      title: "Input Text",
      description: "Input text into an element or at coordinates",
      inputSchema: {
        text: z.string().describe('The text to input'),
        element_id: z.string().optional().describe('The element ID to input text into'),
        x: z.number().optional().describe('X coordinate for text input'),
        y: z.number().optional().describe('Y coordinate for text input'),
        press_enter: z.boolean().optional().describe('Whether to press Enter after input'),
        delete_existing_text: z.boolean().optional().describe('Whether to delete existing text before input')
      }
    },
    async (params: any) => {
      try {
        if (!params?.text) {
          throw new Error("text parameter is required");
        }
        
        if (!params?.element_id && (params?.x === undefined || params?.y === undefined)) {
          throw new Error("Either element_id or both x and y coordinates must be provided");
        }
        
        await executeBrowserAction("text", params);
        
        return {
          content: [{
            type: "text",
            text: `Successfully input text: "${params.text}"`
          }]
        };
      } catch (error) {
        console.error("Text Input Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error inputting text: ${error.message}`
          }]
        };
      }
    }
  );

  // Scroll Up Tool
  mcpServer.registerTool(
    "scroll_up",
    {
      title: "Scroll Up",
      description: "Scroll the page up by one page"
    },
    async () => {
      try {
        await executeBrowserAction("scroll_up");
        
        return {
          content: [{
            type: "text",
            text: "Successfully scrolled up"
          }]
        };
      } catch (error) {
        console.error("Scroll Up Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error scrolling up: ${error.message}`
          }]
        };
      }
    }
  );

  // Scroll Down Tool
  mcpServer.registerTool(
    "scroll_down",
    {
      title: "Scroll Down",
      description: "Scroll the page down by one page"
    },
    async () => {
      try {
        await executeBrowserAction("scroll_down");
        
        return {
          content: [{
            type: "text",
            text: "Successfully scrolled down"
          }]
        };
      } catch (error) {
        console.error("Scroll Down Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error scrolling down: ${error.message}`
          }]
        };
      }
    }
  );

  // Wait Tool
  mcpServer.registerTool(
    "wait",
    {
      title: "Wait",
      description: "Wait for a specified amount of time",
      inputSchema: {
        time: z.number().positive().describe('Time to wait in seconds')
      }
    },
    async (params: any) => {
      try {
        const time = params?.time;
        if (!time) {
          throw new Error("time parameter is required");
        }
        
        await executeBrowserAction("wait", { time });
        
        return {
          content: [{
            type: "text",
            text: `Successfully waited for ${time} seconds`
          }]
        };
      } catch (error) {
        console.error("Wait Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error waiting: ${error.message}`
          }]
        };
      }
    }
  );

  // Key Press Tool
  mcpServer.registerTool(
    "key_press",
    {
      title: "Press Key(s)",
      description: "Press one or more keys",
      inputSchema: {
        keys: z.union([
          z.string(),
          z.array(z.string())
        ]).describe('Key or array of keys to press')
      }
    },
    async (params: any) => {
      try {
        const keys = params?.keys;
        if (!keys) {
          throw new Error("keys parameter is required");
        }
        
        await executeBrowserAction("key_press", { keys });
        
        const keysStr = Array.isArray(keys) ? keys.join(', ') : keys;
        return {
          content: [{
            type: "text",
            text: `Successfully pressed key(s): ${keysStr}`
          }]
        };
      } catch (error) {
        console.error("Key Press Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error pressing key(s): ${error.message}`
          }]
        };
      }
    }
  );

  // Hover Tool
  mcpServer.registerTool(
    "hover",
    {
      title: "Hover Element",
      description: "Hover over an element either by element_id or coordinates",
      inputSchema: {
        element_id: z.string().optional().describe('The element ID to hover over'),
        x: z.number().optional().describe('X coordinate for hover'),
        y: z.number().optional().describe('Y coordinate for hover')
      }
    },
    async (params: any) => {
      try {
        if (!params?.element_id && (params?.x === undefined || params?.y === undefined)) {
          throw new Error("Either element_id or both x and y coordinates must be provided");
        }
        
        await executeBrowserAction("hover", params);
        
        let message = "Successfully hovered over ";
        if (params.element_id) {
          message += `element with ID: ${params.element_id}`;
        } else {
          message += `coordinates (${params.x}, ${params.y})`;
        }
        
        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        console.error("Hover Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error hovering: ${error.message}`
          }]
        };
      }
    }
  );

  // Evaluate Tool
  mcpServer.registerTool(
    "evaluate",
    {
      title: "Evaluate JavaScript",
      description: "Execute JavaScript code in the browser context",
      inputSchema: {
        script: z.string().describe('JavaScript code to execute')
      }
    },
    async (params: any) => {
      try {
        const script = params?.script;
        if (!script) {
          throw new Error("script parameter is required");
        }
        
        const result = await executeBrowserAction("evaluate", { script });
        
        return {
          content: [{
            type: "text",
            text: `JavaScript execution result: ${result}`
          }]
        };
      } catch (error) {
        console.error("Evaluate Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error executing JavaScript: ${error.message}`
          }]
        };
      }
    }
  );

  // Content Tool
  mcpServer.registerTool(
    "content",
    {
      title: "Get Page Content",
      description: "Get the HTML content of the current page"
    },
    async () => {
      try {
        const content = await executeBrowserAction("content");
        
        return {
          content: [{
            type: "text",
            text: content
          }]
        };
      } catch (error) {
        console.error("Content Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error getting page content: ${error.message}`
          }]
        };
      }
    }
  );

  // Create Tab Tool
  mcpServer.registerTool(
    "create_tab",
    {
      title: "Create New Tab",
      description: "Create a new browser tab",
      inputSchema: {
        url: z.string().optional().describe('URL to navigate to in the new tab')
      }
    },
    async (params: any) => {
      try {
        await executeBrowserAction("create_tab", params || {});
        
        const message = params?.url 
          ? `Successfully created new tab with URL: ${params.url}`
          : "Successfully created new blank tab";
        
        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        console.error("Create Tab Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error creating tab: ${error.message}`
          }]
        };
      }
    }
  );

  // Switch Tab Tool
  mcpServer.registerTool(
    "switch_tab",
    {
      title: "Switch Tab",
      description: "Switch to a specific tab by index",
      inputSchema: {
        tab_index: z.number().int().nonnegative().describe('Index of the tab to switch to')
      }
    },
    async (params: any) => {
      try {
        const tabIndex = params?.tab_index;
        if (tabIndex === undefined) {
          throw new Error("tab_index parameter is required");
        }
        
        await executeBrowserAction("switch_tab", { tab_index: tabIndex });
        
        return {
          content: [{
            type: "text",
            text: `Successfully switched to tab ${tabIndex}`
          }]
        };
      } catch (error) {
        console.error("Switch Tab Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error switching tab: ${error.message}`
          }]
        };
      }
    }
  );

  // Close Tab Tool
  mcpServer.registerTool(
    "close_tab",
    {
      title: "Close Tab",
      description: "Close a specific tab by index",
      inputSchema: {
        tab_index: z.number().int().nonnegative().describe('Index of the tab to close')
      }
    },
    async (params: any) => {
      try {
        const tabIndex = params?.tab_index;
        if (tabIndex === undefined) {
          throw new Error("tab_index parameter is required");
        }
        
        await executeBrowserAction("close_tab", { tab_index: tabIndex });
        
        return {
          content: [{
            type: "text",
            text: `Successfully closed tab ${tabIndex}`
          }]
        };
      } catch (error) {
        console.error("Close Tab Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error closing tab: ${error.message}`
          }]
        };
      }
    }
  );

  // Tabs Info Tool
  mcpServer.registerTool(
    "tabs_info",
    {
      title: "Get Tabs Information",
      description: "Get information about all open tabs"
    },
    async () => {
      try {
        const tabsInfo = await executeBrowserAction("tabs_info");
        
        return {
          content: [{
            type: "text",
            text: tabsInfo
          }]
        };
      } catch (error) {
        console.error("Tabs Info Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error getting tabs information: ${error.message}`
          }]
        };
      }
    }
  );

  // Screenshot Tool
  mcpServer.registerTool(
    "screenshot",
    {
      title: "Take Screenshot",
      description: "Take a screenshot of the current page"
    },
    async () => {
      try {
        const screenshot = await executeBrowserAction("screenshot");
        
        return {
          content: [{
            type: "text",
            text: `Screenshot taken (base64 encoded): ${screenshot.substring(0, 100)}...`
          }]
        };
      } catch (error) {
        console.error("Screenshot Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error taking screenshot: ${error.message}`
          }]
        };
      }
    }
  );
  // Click Full Tool
  mcpServer.registerTool(
    "click_full",
    {
      title: "Click Element (Full Options)",
      description: "Click on an element with full options including hold time and button type",
      inputSchema: {
        element_id: z.string().optional().describe('The element ID to click'),
        x: z.number().optional().describe('X coordinate for click'),
        y: z.number().optional().describe('Y coordinate for click'),
        hold: z.number().optional().describe('Hold time in seconds'),
        button: z.enum(["left", "right", "middle"]).optional().describe('Mouse button to click')
      }
    },
    async (params: any) => {
      try {
        if (!params?.element_id && (params?.x === undefined || params?.y === undefined)) {
          throw new Error("Either element_id or both x and y coordinates must be provided");
        }
        
        await executeBrowserAction("click_full", params);
        
        let message = "Successfully clicked ";
        if (params.element_id) {
          message += `element with ID: ${params.element_id}`;
        } else {
          message += `at coordinates (${params.x}, ${params.y})`;
        }
        
        if (params.hold) {
          message += ` with hold time ${params.hold}s`;
        }
        
        if (params.button) {
          message += ` using ${params.button} button`;
        }
        
        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        console.error("Click Full Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error clicking element: ${error.message}`
          }]
        };
      }
    }
  );

  // Scroll Element Up Tool
  mcpServer.registerTool(
    "scroll_element_up",
    {
      title: "Scroll Element Up",
      description: "Scroll an element up by a specified number of pages",
      inputSchema: {
        element_id: z.string().optional().describe('The element ID to scroll'),
        x: z.number().optional().describe('X coordinate of element to scroll'),
        y: z.number().optional().describe('Y coordinate of element to scroll'),
        page_number: z.number().int().positive().describe('Number of pages to scroll up')
      }
    },
    async (params: any) => {
      try {
        if (!params?.element_id && (params?.x === undefined || params?.y === undefined)) {
          throw new Error("Either element_id or both x and y coordinates must be provided");
        }
        
        if (!params?.page_number) {
          throw new Error("page_number parameter is required");
        }
        
        await executeBrowserAction("scroll_element_up", params);
        
        let message = `Successfully scrolled up ${params.page_number} page(s) on `;
        if (params.element_id) {
          message += `element with ID: ${params.element_id}`;
        } else {
          message += `element at coordinates (${params.x}, ${params.y})`;
        }
        
        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        console.error("Scroll Element Up Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error scrolling element up: ${error.message}`
          }]
        };
      }
    }
  );

  // Scroll Element Down Tool
  mcpServer.registerTool(
    "scroll_element_down",
    {
      title: "Scroll Element Down",
      description: "Scroll an element down by a specified number of pages",
      inputSchema: {
        element_id: z.string().optional().describe('The element ID to scroll'),
        x: z.number().optional().describe('X coordinate of element to scroll'),
        y: z.number().optional().describe('Y coordinate of element to scroll'),
        page_number: z.number().int().positive().describe('Number of pages to scroll down')
      }
    },
    async (params: any) => {
      try {
        if (!params?.element_id && (params?.x === undefined || params?.y === undefined)) {
          throw new Error("Either element_id or both x and y coordinates must be provided");
        }
        
        if (!params?.page_number) {
          throw new Error("page_number parameter is required");
        }
        
        await executeBrowserAction("scroll_element_down", params);
        
        let message = `Successfully scrolled down ${params.page_number} page(s) on `;
        if (params.element_id) {
          message += `element with ID: ${params.element_id}`;
        } else {
          message += `element at coordinates (${params.x}, ${params.y})`;
        }
        
        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        console.error("Scroll Element Down Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error scrolling element down: ${error.message}`
          }]
        };
      }
    }
  );

  // Scroll To Tool
  mcpServer.registerTool(
    "scroll_to",
    {
      title: "Scroll To Element",
      description: "Scroll to make an element visible",
      inputSchema: {
        element_id: z.string().describe('The element ID to scroll to')
      }
    },
    async (params: any) => {
      try {
        if (!params?.element_id) {
          throw new Error("element_id parameter is required");
        }
        
        await executeBrowserAction("scroll_to", params);
        
        return {
          content: [{
            type: "text",
            text: `Successfully scrolled to element with ID: ${params.element_id}`
          }]
        };
      } catch (error) {
        console.error("Scroll To Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error scrolling to element: ${error.message}`
          }]
        };
      }
    }
  );

  // Init JS Tool
  mcpServer.registerTool(
    "init_js",
    {
      title: "Initialize JavaScript",
      description: "Initialize JavaScript on the current page"
    },
    async () => {
      try {
        await executeBrowserAction("init_js");
        
        return {
          content: [{
            type: "text",
            text: "Successfully initialized JavaScript on the page"
          }]
        };
      } catch (error) {
        console.error("Init JS Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error initializing JavaScript: ${error.message}`
          }]
        };
      }
    }
  );

  // Wait For Load State Tool
  mcpServer.registerTool(
    "wait_for_load_state",
    {
      title: "Wait For Page Load",
      description: "Wait for the page to reach load state"
    },
    async () => {
      try {
        await executeBrowserAction("wait_for_load_state");
        
        return {
          content: [{
            type: "text",
            text: "Successfully waited for page load state"
          }]
        };
      } catch (error) {
        console.error("Wait For Load State Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error waiting for load state: ${error.message}`
          }]
        };
      }
    }
  );

  // Cleanup Animations Tool
  mcpServer.registerTool(
    "cleanup_animations",
    {
      title: "Cleanup Animations",
      description: "Remove animation effects from the page"
    },
    async () => {
      try {
        await executeBrowserAction("cleanup_animations");
        
        return {
          content: [{
            type: "text",
            text: "Successfully cleaned up animations"
          }]
        };
      } catch (error) {
        console.error("Cleanup Animations Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error cleaning up animations: ${error.message}`
          }]
        };
      }
    }
  );

  // Preview Action Tool
  mcpServer.registerTool(
    "preview_action",
    {
      title: "Preview Action",
      description: "Preview an action by highlighting the target element",
      inputSchema: {
        element_id: z.string().describe('The element ID to preview')
      }
    },
    async (params: any) => {
      try {
        if (!params?.element_id) {
          throw new Error("element_id parameter is required");
        }
        
        await executeBrowserAction("preview_action", params);
        
        return {
          content: [{
            type: "text",
            text: `Successfully previewed action on element with ID: ${params.element_id}`
          }]
        };
      } catch (error) {
        console.error("Preview Action Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error previewing action: ${error.message}`
          }]
        };
      }
    }
  );

  // Set Content Tool
  mcpServer.registerTool(
    "set_content",
    {
      title: "Set Page Content",
      description: "Set the HTML content of the current page",
      inputSchema: {
        content: z.string().describe('The HTML content to set')
      }
    },
    async (params: any) => {
      try {
        if (!params?.content) {
          throw new Error("content parameter is required");
        }
        
        await executeBrowserAction("set_content", params);
        
        return {
          content: [{
            type: "text",
            text: "Successfully set page content"
          }]
        };
      } catch (error) {
        console.error("Set Content Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error setting page content: ${error.message}`
          }]
        };
      }
    }
  );

  // Ensure Page Ready Tool
  mcpServer.registerTool(
    "ensure_page_ready",
    {
      title: "Ensure Page Ready",
      description: "Ensure the page is fully loaded and ready"
    },
    async () => {
      try {
        await executeBrowserAction("ensure_page_ready");
        
        return {
          content: [{
            type: "text",
            text: "Successfully ensured page is ready"
          }]
        };
      } catch (error) {
        console.error("Ensure Page Ready Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error ensuring page ready: ${error.message}`
          }]
        };
      }
    }
  );

  // Select Option Tool
  mcpServer.registerTool(
    "select_option",
    {
      title: "Select Option",
      description: "Select an option in a dropdown or click on an element",
      inputSchema: {
        element_id: z.string().optional().describe('The element ID to select'),
        x: z.number().optional().describe('X coordinate for selection'),
        y: z.number().optional().describe('Y coordinate for selection')
      }
    },
    async (params: any) => {
      try {
        if (!params?.element_id && (params?.x === undefined || params?.y === undefined)) {
          throw new Error("Either element_id or both x and y coordinates must be provided");
        }
        
        await executeBrowserAction("select_option", params);
        
        let message = "Successfully selected ";
        if (params.element_id) {
          message += `element with ID: ${params.element_id}`;
        } else {
          message += `element at coordinates (${params.x}, ${params.y})`;
        }
        
        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        console.error("Select Option Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error selecting option: ${error.message}`
          }]
        };
      }
    }
  );

  // Drag Tool
  mcpServer.registerTool(
    "drag",
    {
      title: "Drag Element",
      description: "Drag an element along a specified path",
      inputSchema: {
        drag_path: z.union([
          z.string(), // JSON string
          z.array(z.object({
            x: z.number(),
            y: z.number()
          }))
        ]).describe('Path to drag along, as array of points or JSON string')
      }
    },
    async (params: any) => {
      try {
        if (!params?.drag_path) {
          throw new Error("drag_path parameter is required");
        }
        
        await executeBrowserAction("drag", params);
        
        return {
          content: [{
            type: "text",
            text: "Successfully performed drag operation"
          }]
        };
      } catch (error) {
        console.error("Drag Tool Error:", error);
        return {
          content: [{
            type: "text",
            text: `Error performing drag operation: ${error.message}`
          }]
        };
      }
    }
  );
}
