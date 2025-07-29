# Wyse Browser

The Wyse Browser is a powerful browser automation engine built with NestJS and Playwright. It provides a robust platform for creating, managing, and executing complex automation workflows through a comprehensive REST API. The engine is designed for modularity and extensibility, allowing developers to define reusable automation components and chain them together to create sophisticated automation scripts.

## Architecture Overview

The Wyse Browser engine is composed of several key components that work together to provide a flexible and powerful automation environment:

- **API Layer**: A NestJS application that exposes a RESTful API for controlling the engine. It handles requests for session management, flow execution, and direct browser actions.
- **Runtime**: The central orchestrator of the engine. It manages the lifecycle of browser sessions and flows, ensuring that they are created, executed, and torn down correctly.
- **Session**: Represents a single, isolated browser instance powered by Playwright. Each session is sandboxed and can be configured with different settings, including browser extensions and anti-bot-detection fingerprints.
- **Flow**: A high-level automation script defined by a JSON manifest. A flow is a directed graph of "Worklets," where each node represents a specific task and the edges define the sequence of execution.
- **Worklet**: A reusable and modular component that encapsulates a specific set of related actions. For example, a `Twitter` worklet might contain actions for logging in, sending a tweet, and searching for users.
- **BrowserAction**: A low-level module that implements the concrete browser automation commands, such as clicking elements, typing text, and navigating between pages.

## Core Concepts

- **Session**: A browser session, uniquely identified by a `session_id`. Each session can manage multiple pages (tabs) and maintains its own cookies, local storage, and configuration.
- **Flow**: A predefined workflow that consists of a series of steps. Flows are defined in JSON manifests and can be created, deployed, and triggered via the API. Each running flow has a unique `flow_instance_id`.
- **Worklet**: The building blocks of a Flow. Each Worklet represents a specific capability (e.g., interacting with a particular website, performing I/O operations).
- **Action**: The smallest unit of execution. An action is a single command performed on a browser page, such as `click`, `visit`, or `screenshot`.
- **Manifest**: A JSON file that defines the structure of a Flow, including its Worklets (nodes) and the connections between them (edges), as well as input parameters and properties.

## API Endpoints

The Wyse Browser exposes a rich set of API endpoints for programmatic control over browser automation tasks.

### Health Check
- `GET /api/health`: Checks if the API server is running.

### Flow Management
- `POST /api/flow/create`: Creates a new flow instance from a predefined manifest.
- `POST /api/flow/deploy`: Deploys a new flow using an inline JSON definition.
- `POST /api/flow/fire`: Executes an action within a running flow instance.
- `GET /api/flow/list`: Lists all active flow instances.

### Metadata Management
- `GET /api/metadata/flow/:name`: Retrieves the manifest for a specific flow.
- `GET /api/metadata/worklet/:name`: Retrieves the manifest for a specific worklet.
- `GET /api/metadata/list/:type`: Lists all available metadata for a given type (`flow` or `worklet`).
- `POST /api/metadata/save`: Saves or updates a flow manifest.

### Session Management
- `POST /api/session/create`: Creates a new browser session.
- `GET /api/session/:sessionId`: Retrieves details for a specific session.
- `GET /api/session/:sessionId/context`: Gets the context (cookies, local storage) of a session.
- `GET /api/session/:sessionId/release`: Closes and cleans up a session.
- `GET /api/sessions/list`: Lists all active sessions.
- `GET /api/session/:sessionId/screenshot`: Takes a screenshot of the current page in a session.

### Page Management
- `POST /api/session/:sessionId/page/create`: Creates a new page (tab) in a session.
- `GET /api/session/:sessionId/page/:pageId/switch`: Switches the active page in a session.
- `GET /api/session/:sessionId/page/:pageId/release`: Closes a specific page in a session.

### Browser Actions
- `POST /api/browser/action`: Executes a single browser action (e.g., `click`, `text`) in a session.
- `POST /api/browser/batch_actions`: Executes a batch of browser actions sequentially.

## Usage

### Preparation

Build all worklets:
```bash
./build_worklets.sh
```

Make sure the version of Node.js is 20.x.x.

```bash
pnpm install
```

### Run API dev server

The API service uses the NestJS framework, and the default port is `13100`.

```bash
pnpm run start:dev
``` 
