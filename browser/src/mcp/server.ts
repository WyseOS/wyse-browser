import { v4 as uuidv4 } from 'uuid';
import { Runtime } from '../runtime';
import { registerTools } from './tools';
import { BrowserAction } from '../action';
import { SessionContext } from '../session_context';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';

// Create MCP server instance
export const mcpServer = new McpServer({
  name: 'wyse-browser-mcp',
  version: '0.1.0',
});

// Session management
let runtime: Runtime | null = null;
const activeSessions = new Map<string, any>();

// Initialize runtime
async function initializeRuntime(): Promise<Runtime> {
  if (!runtime) {
    runtime = new Runtime();
  }
  return runtime;
}

// Create a new session
async function createNewSession(): Promise<{ sessionId: string; session: any }> {
  const runtime = await initializeRuntime();
  const sessionContext = SessionContext.Default();
  const sessionId = uuidv4();

  try {
    await runtime.createSession(sessionContext, sessionId);
    const session = runtime.getSession(sessionId);
    activeSessions.set(sessionId, session);

    return { sessionId, session };
  } catch (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }
}

// Get active session or create a new one
async function getOrCreateSession(): Promise<{ sessionId: string; session: any }> {
  // For now, create a new session each time
  // In a production environment, you might want to track and reuse sessions
  return await createNewSession();
}

// Execute browser action
export async function executeBrowserAction(actionName: string, params: Record<string, any> = {}): Promise<string> {
  try {
    const { session } = await getOrCreateSession();
    const browserAction = new BrowserAction();

    // Page ID 0 for the first/primary page
    const result = await browserAction.action(session, 0, actionName, params);
    return result;
  } catch (error) {
    throw new Error(`Failed to execute ${actionName}: ${error.message}`);
  }
}

registerTools(mcpServer)

async function main() {
  try {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("MCP server is running...");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});