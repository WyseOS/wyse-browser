# MCP Server Quick Start

## Prerequisites

Ensure the browser project is built:

```bash
cd ../browser
pnpm install
pnpm build
```

## Installation

```bash
cd mcp-server
pnpm install
```

Or use workspace installation from the project root:

```bash
cd /path/to/wyse-browser
pnpm install
```

## Build

```bash
pnpm build
```

## Running

### Method 1: Direct Run

```bash
pnpm start
```

### Method 2: Debug with Inspector

```bash
pnpm inspector
```

This will start the MCP Inspector, where you can test various tools in the browser.

## Integration with Claude Desktop

1. Locate the Claude Desktop configuration file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the configuration:

```json
{
  "mcpServers": {
    "wyse-browser": {
      "command": "node",
      "args": ["/absolute/path/to/wyse-browser/mcp-server/dist/index.js"]
    }
  }
}
```

3. Restart Claude Desktop

## Development Mode

Listen for file changes and automatically recompile:

```bash
pnpm dev
```

## Available Tools

The MCP server provides the following browser control tools:

### Navigation
- `visit` - Visit URL
- `url` - Get current URL
- `history` - Browser history navigation
- `search` - Google search
- `refresh_page` - Refresh page

### Page Interaction
- `click` - Click element
- `double_click` - Double click element
- `text` - Input text
- `hover` - Hover
- `key_press` - Key press
- `select_option` - Select dropdown option

### Scrolling
- `scroll_up` - Scroll up
- `scroll_down` - Scroll down
- `scroll_to` - Scroll to element
- `scroll_element_up` - Scroll element up
- `scroll_element_down` - Scroll element down

### Tab Management
- `create_tab` - Create new tab
- `switch_tab` - Switch tab
- `close_tab` - Close tab
- `tabs_info` - Get tab information

### Other
- `screenshot` - Screenshot
- `content` - Get page content
- `evaluate` - Execute JavaScript
- `wait` - Wait
- `drag` - Drag

## Troubleshooting

### Issue: `wyse-browser` module not found

**Solution**:
```bash
# In the root directory
pnpm install

# Ensure browser is built
cd browser
pnpm build
```

### Issue: MCP server fails to start

**Check**:
1. Is the browser service running (if required)?
2. Is Node.js version >= 18?
3. Check error logs.

### Issue: Claude Desktop fails to connect

**Check**:
1. Is the configuration file path correct (use absolute path)?
2. Is the MCP server successfully built?
3. Restart Claude Desktop.

## More Information

- [Full Documentation](./README.md)
- [Migration Guide](../MIGRATION.md)
- [Browser API Documentation](../browser/README.md)
