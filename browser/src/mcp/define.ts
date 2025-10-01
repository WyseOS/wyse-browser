import type { z } from 'zod';
import type { Context } from './context';
import type { Tab, ModalState } from './tab';
import { type ToolCapability, type ToolSchema } from './tool';
import type { Response } from './response';
import { zodToJsonSchema } from 'zod-to-json-schema';

// const zodToJsonSchema: typeof import('zod-to-json-schema').zodToJsonSchema = zodToJsonSchema;

export type TabTool<Input extends z.Schema = z.Schema> = {
  capability: ToolCapability;
  schema: ToolSchema<Input>;
  clearsModalState?: ModalState['type'];
  handle: (tab: Tab, params: z.output<Input>, response: Response) => Promise<void>;
};

export type Tool<Input extends z.Schema = z.Schema> = {
  capability: ToolCapability;
  schema: ToolSchema<Input>;
  handle: (context: Context, params: z.output<Input>, response: Response) => Promise<void>;
};


// export function toMcpTool(tool: ToolSchema<any>): mcpServer.Tool {
//   return {
//     name: tool.name,
//     description: tool.description,
//     inputSchema: zodToJsonSchema(tool.inputSchema, { strictUnions: true }) as mcpServer.Tool['inputSchema'],
//     annotations: {
//       title: tool.title,
//       readOnlyHint: tool.type === 'readOnly',
//       destructiveHint: tool.type === 'destructive',
//       openWorldHint: true,
//     },
//   };
// }

export function defineTool<Input extends z.Schema>(tool: Tool<Input>): Tool<Input> {
  return tool;
}

export function defineTabTool<Input extends z.Schema>(tool: TabTool<Input>): Tool<Input> {
  return {
    ...tool,
    handle: async (context, params, response) => {
      const tab = await context.ensureTab();
      const modalStates = tab.modalStates().map(state => state.type);
    //   if (tool.clearsModalState && !modalStates.includes(tool.clearsModalState))
        // response.addError(`Error: The tool "${tool.schema.name}" can only be used when there is related modal state present.\n` + tab.modalStatesMarkdown().join('\n'));
    //   else if (!tool.clearsModalState && modalStates.length)
        // response.addError(`Error: Tool "${tool.schema.name}" does not handle the modal state.\n` + tab.modalStatesMarkdown().join('\n'));
    //   else
        return tool.handle(tab, params, response);
    },
  };
}

// const browserTabs = defineTool({
//   capability: 'core-tabs',

//   schema: {
//     name: 'browser_tabs',
//     title: 'Manage tabs',
//     description: 'List, create, close, or select a browser tab.',
//     inputSchema: z.object({
//       action: z.enum(['list', 'new', 'close', 'select']).describe('Operation to perform'),
//       index: z.number().optional().describe('Tab index, used for close/select. If omitted for close, current tab is closed.'),
//     }),
//     type: 'destructive',
//   },

//   handle: async (context, params, response) => {
//     switch (params.action) {
//       case 'list': {
//         await context.ensureTab();
//         response.setIncludeTabs();
//         return;
//       }
//       case 'new': {
//         await context.newTab();
//         response.setIncludeTabs();
//         return;
//       }
//       case 'close': {
//         await context.closeTab(params.index);
//         response.setIncludeSnapshot();
//         return;
//       }
//       case 'select': {
//         if (params.index === undefined)
//           throw new Error('Tab index is required');
//         await context.selectTab(params.index);
//         response.setIncludeSnapshot();
//         return;
//       }
//     }
//   },
// });

// export default [
//   browserTabs,
// ];