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

### Base URL

```
http://127.0.0.1:13100
```

### Health Check

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Checks if the API server is running. | _None_ |

### Metadata Management

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/metadata/flow/:name` | Retrieves the manifest for a specific flow. | **Path**: `name` (string, required) |
| `GET` | `/api/metadata/worklet/:name` | Retrieves the manifest for a specific worklet. | **Path**: `name` (string, required) |
| `GET` | `/api/metadata/list/:type` | Lists all available metadata for a given type (`flow` or `worklet`). | **Path**: `type` (string, required) - `flow` or `worklet` |
| `POST` | `/api/metadata/save` | Saves or updates a flow manifest. | **Body**: `UpdateMetadataDto`<br>- `metadata_type` (string, required)<br>- `name` (string, required)<br>- `data` (object, required) |

### Session Management

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/session/create` | Creates a new browser session. | **Body**: `CreateSessionDto`<br>- `session_context` (object, optional)<br>- `session_id` (string, optional) |
| `POST` | `/api/session/:sessionId/add_init_script` | Adds an initialization script to the session. | **Path**: `sessionId` (string, required)<br>**Body**: `AddInitScriptDto`<br>- `script` (string, required) |
| `GET` | `/api/session/:sessionId` | Retrieves details for a specific session. | **Path**: `sessionId` (string, required) |
| `GET` | `/api/session/:sessionId/context` | Gets the context (cookies, local storage) of a session. | **Path**: `sessionId` (string, required) |
| `GET` | `/api/session/:sessionId/release` | Closes and cleans up a session. | **Path**: `sessionId` (string, required) |
| `GET` | `/api/sessions/list` | Lists all active sessions. | _None_ |
| `GET` | `/api/session/:sessionId/screenshot` | Takes a screenshot of the current page in a session. | **Path**: `sessionId` (string, required) |

### Browser Actions

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/browser/action` | Executes a single browser action (e.g., `click`, `text`). | **Body**: `BrowserActionDto`<br>- `session_id` (string, required)<br>- `page_id` (number, optional, default: 0)<br>- `action_name` (string, required)<br>- `data` (object, required) |
| `POST` | `/api/browser/batch_actions` | Executes a batch of browser actions sequentially. | **Body**: `BatchActionsDto`<br>- `session_id` (string, required)<br>- `page_id` (number, optional, default: 0)<br>- `actions` (array, required):<br>  - `action_name` (string, required)<br>  - `data` (object, required) |

### Page Management

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/session/:sessionId/page/create` | Creates a new page (tab) in a session. | **Path**: `sessionId` (string, required) |
| `GET` | `/api/session/:sessionId/page/:pageId/switch` | Switches the active page in a session. | **Path**:<br>- `sessionId` (string, required)<br>- `pageId` (number, required) |
| `GET` | `/api/session/:sessionId/page/:pageId/release` | Closes a specific page in a session. | **Path**:<br>- `sessionId` (string, required)<br>- `pageId` (number, required) |

### Flow Management

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/flow/create` | Creates a new flow instance from a predefined manifest. | **Body**: `CreateFlowDto`<br>- `flow_name` (string, required)<br>- `session_id` (string, optional)<br>- `is_save_video` (boolean, optional)<br>- `extension_names` (string[], optional) |
| `POST` | `/api/flow/deploy` | Deploys a new flow using an inline JSON definition. | **Body**: `DeployFlowDto`<br>- `flow` (object, required)<br>- `session_id` (string, optional)<br>- `is_save_video` (boolean, optional)<br>- `extension_names` (string[], optional) |
| `POST` | `/api/flow/fire` | Executes an action within a running flow instance. | **Body**: `FireFlowDto`<br>- `flow_instance_id` (string, required)<br>- `action_name` (string, optional, default: `action_flow_start`)<br>- `data` (object, required) |
| `GET` | `/api/flow/list` | Lists all active flow instances. | _None_ |

### File Management

| Method | Endpoint | Description | Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/sessions/:sessionId/files` | Uploads one or more files to a session, checking against session storage limits. | **Path**: `sessionId` (string, required)<br>**Body**: `filePath` (string, optional) - target path for the file, defaults to original name. |
| `GET` | `/api/sessions/:sessionId/files` | Lists all files stored within a specific session. | **Path**: `sessionId` (string, required) |
| `GET` | `/api/sessions/:sessionId/files/*` | Downloads a specific file from a session. | **Path**:<br>- `sessionId` (string, required)<br>- `filePath` (string, required) |
| `HEAD` | `/api/sessions/:sessionId/files/*` | Retrieves metadata (headers) for a specific file in a session without downloading the content. | **Path**:<br>- `sessionId` (string, required)<br>- `filePath` (string, required) |
| `GET` | `/api/sessions/:sessionId/files.zip` | Downloads all files from a session as a ZIP archive. | **Path**: `sessionId` (string, required) |
| `DELETE` | `/api/sessions/:sessionId/files/*` | Deletes a specific file from a session. | **Path**:<br>- `sessionId` (string, required)<br>- `filePath` (string, required) |
| `DELETE` | `/api/sessions/:sessionId/files` | Deletes all files associated with a specific session. | **Path**: `sessionId` (string, required) |

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

## Action Space

The `BrowserAction` module provides a comprehensive set of low-level actions that can be executed on a page within a session. These actions are the fundamental building blocks for creating complex automation flows.

| Action | Description | Parameters |
| :--- | :--- | :--- |
| `url` | Gets the URL of the current page. | _None_ |
| `visit` | Navigates the page to a specified URL. | `url`: The URL to visit. |
| `history` | Navigates forward or backward in the browser history. | `num`: A positive number to go forward, a negative number to go back. |
| `search` | Performs a Google search. | `search_key`: The text to search for. |
| `refreshpage` | Reloads the current page. | _None_ |
| `click` | Clicks an element or a point on the page. | `element_id` or (`x`, `y` coordinates). |
| `clickfull` | A more comprehensive click action. | `element_id` or (`x`, `y` coordinates). Optional: `hold` (seconds), `button` ("left", "right", "middle"). |
| `doubleclick` | Double-clicks an element or a point on the page. | `element_id` or (`x`, `y` coordinates). |
| `text` | Enters text into an element or at the current cursor position. | `text`: The text to type. Optional: `element_id`, `press_enter` (boolean), `delete_existing_text` (boolean), or (`x`, `y` coordinates). |
| `scrollup` | Scrolls the page up. | _None_ |
| `scrolldown` | Scrolls the page down. | _None_ |
| `scrollelementup` | Scrolls an element's container up. | `element_id`, `page_number`: Number of pages to scroll. |
| `scrollelementdown` | Scrolls an element's container down. | `element_id`, `page_number`: Number of pages to scroll. |
| `scrollto` | Scrolls to make an element visible. | `element_id`: The ID of the element to scroll to. |
| `wait` | Pauses execution for a specified duration. | `time`: The number of seconds to wait. |
| `keypress` | Simulates key presses. | `keys`: A string or array of strings of keys to press (e.g., 'Enter', 'Control+A'). |
| `hover` | Hovers over an element or a point on the page. | `element_id` or (`x`, `y` coordinates). |
| `evaluate` | Executes a JavaScript snippet in the page context. | `script`: The JavaScript code to execute. |
| `initjs` | Injects initialization JavaScript into the page. | _None_ |
| `waitforloadstate` | Waits for the page to reach a specific load state. | _None_ |
| `content` | Gets the full HTML content of the page. | _None_ |
| `createtab` | Creates a new browser tab. | Optional: `url`: The URL to open in the new tab. |
| `switchtab` | Switches to a different tab. | `tab_index`: The index of the tab to switch to. |
| `closetab` | Closes a browser tab. | `tab_index`: The index of the tab to close. |
| `tabsinfo` | Retrieves information about all open tabs. | _None_ |
| `cleanupanimations` | Removes animations from the page to stabilize tests. | _None_ |
| `previewaction` | Highlights an element to preview an action without executing it. | `element_id`: The ID of the element to preview. |
| `setcontent` | Sets the HTML content of the page. | `content`: The HTML content to set. |
| `ensurepageready` | Ensures the page is fully loaded and ready for interaction. | _None_ |
| `selectoption` | Selects an option from a dropdown or custom select component. | `element_id` or (`x`, `y` coordinates). |
| `drag` | Performs a drag-and-drop operation. | `drag_path`: A JSON string or array of points `{x, y}` representing the drag path. |
| `screenshot` | Takes a screenshot of the current page. | _None_ |
