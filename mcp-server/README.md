# Wyse Browser MCP Server

MCP (Model Context Protocol) server for controlling Wyse Browser.

## Features

This MCP server provides browser automation tools including:
- Navigation (visit, history, search)
- Page interaction (click, text input, hover, scroll)
- Tab management
- Screenshots
- JavaScript execution
- And more...

## Installation

```bash
pnpm install
```

## Build

```bash
pnpm build
```

## Usage

- [Quick Start Guide](./QUICKSTART.md)

### 1. Start MCP Server

```bash
pnpm start
```

### 2. Debug with Inspector

```bash
pnpm inspector
```

## Integration

This server can be integrated with any MCP-compatible client. Configure your client to use this server via stdio transport.

Example configuration for Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "wyse-browser": {
      "command": "node",
      "args": ["/path/to/wyse-browser/mcp-server/dist/index.js"]
    }
  }
}
```

## Development

```bash
# Watch mode for development
pnpm dev
```

## Dependencies

This server depends on the `wyse-browser` package for browser automation capabilities.

