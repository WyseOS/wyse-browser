# Wyse Browser

## Overview

Wyse Browser is a powerful, multi-process runtime engine designed for executing automated flows within a browser environment.

## Architecture

The Wyse Browser protocol is built for distributed systems, enabling each engine to manage multiple workflow and worklet instances efficiently.

```mermaid
graph TD
    subgraph Intelligence Layer
        M[LLM]
        A[AI Agents]
    end
    M <--> A
    A --> B(Wyse Browser)
    M -.-> B
    B --> C{Workflow1}
    
    subgraph Wyse Browser
        B
        C
        AS[Action Space]
    end
    B --> AS

    AL[visit<br/>history<br/>search<br/>refresh_page<br/>click<br/>click_full<br/>double_click<br/>text<br/>scroll_up<br/>scroll_down<br/>scroll_element_up<br/>scroll_element_down<br/>scroll_to<br/>wait<br/>key_press<br/>hover<br/>evaluate<br/>init_js<br/>content<br/>create_tab<br/>switch_tab<br/>close_tab<br/>tabs_info<br/>set_content<br/>select_option<br/>drag<br/>screenshot]
    AS --> AL

    subgraph Website
        direction RL
        W2[Website2]
    end
    AL --> W2

    C --> D[Worklet1]
    C --> E[Worklet2]
    C --> F[Worklet3]
    C --> G[Worklet4]
    
    subgraph Local Resource
        D
        E
    end

    subgraph HTTP Resource
        F
        G
    end

    D --> I[Filesystem]
    E --> J[Datasource1]
    F --> K[Website1]
    G --> L[External API]

    style M fill:#D9FFD9,stroke:#66CC66,stroke-width:2px,rx:5px,ry:5px;
    style A fill:#D9FFD9,stroke:#66CC66,stroke-width:2px,rx:5px,ry:5px;
    style B fill:#E0F2FF,stroke:#3399FF,stroke-width:2px;
    style C fill:#E0F2FF,stroke:#3399FF,stroke-width:1px,rx:5px,ry:5px;
    style AS fill:#E0F2FF,stroke:#3399FF,stroke-width:1px,rx:5px,ry:5px;
    style D fill:#FFD9D9,stroke:#FF6666,stroke-width:1px,rx:5px,ry:5px;
    style E fill:#FFD9D9,stroke:#FF6666,stroke-width:1px,rx:5px,ry:5px;
    style F fill:#E6E6FA,stroke:#9370DB,stroke-width:1px,rx:5px,ry:5px;
    style G fill:#E6E6FA,stroke:#9370DB,stroke-width:1px,rx:5px,ry:5px;
    style I fill:#FFD9D9,stroke:#FF6666,stroke-width:1px,rx:5px,ry:5px;
    style J fill:#FFD9D9,stroke:#FF6666,stroke-width:1px,rx:5px,ry:5px;
    style K fill:#E6E6FA,stroke:#9370DB,stroke-width:1px,rx:5px,ry:5px;
    style L fill:#E6E6FA,stroke:#9370DB,stroke-width:1px,rx:5px,ry:5px;
    style W2 fill:#E6E6FA,stroke:#9370DB,stroke-width:1px,rx:5px,ry:5px;
    style AL fill:#FFF,stroke:#333,stroke-width:1px,rx:5px,ry:5px;
```

## Browser Action Space

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


## Work Flow

### Runtime

The **Runtime** provides an execution environment tailored for running flows in a multi-process mode. It features a flexible architecture for effective management and execution of both Worklets and Workflows.

It acts as the central coordinator, responsible for:

-   Managing multiple workflow and worklet instances.
-   Controlling client connection permissions and lifecycles.
-   Enforcing security policies and consent requirements.
-   Tracking progress and status of executions.

### Workflow

A **Workflow** defines a precise sequence of worklets executed in a specific order. Workflows are designed and created by AI agents and maintain isolated data connections within the Wyse Browser. Developers can establish bi-directional data communication through the Inter-Worklet Communication (IWC) protocol by arranging worklets and connections within a flow.

### Worklet

A **Worklet** is a reusable, autonomous, and highly composable code block dedicated to performing a specific task. Worklets expose resources and tools, operating independently with focused responsibilities. They can be implemented in various programming languages and function as either local processes or remote services.


## Security and Safety

Security and user safety are paramount in Wyse Browser:

1.  **User Consent and Control**:
    *   Users must explicitly consent to and fully understand all data access and operations.
    *   Users must retain absolute control over data sharing and actions taken on their behalf.
    *   The Wyse Browser is designed to provide clear user interfaces and logs for comprehensive review and auditing of all activities.

2.  **Data Privacy**:
    *   Applications must obtain explicit user consent before exposing any user data to external servers.
    *   Applications are strictly prohibited from transmitting resource data elsewhere without explicit user consent.
    *   User data is protected with appropriate access controls to ensure confidentiality and integrity.

3.  **Worklet Safety**:
    *   Worklets involve arbitrary code execution and must be handled with extreme caution.
    *   Hosts must obtain explicit user consent before invoking any worklet.
    *   Users should have a clear understanding of each worklet's functionality before authorizing its use.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
