# Wyse Browser 🚀

[English](README.md) [简体中文](README_zh-CN.md)

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/wyse-work/wyse-browser)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Wyse Browser is a powerful, multi-process runtime engine designed for executing automated flows within a browser environment. It provides a robust platform for creating, managing, and executing complex automation workflows through a comprehensive REST API.

## Key Features 🌟

-   **Powerful & Scalable Automation Core** ✨: Built on NestJS and Playwright, Wyse Browser provides a reliable and efficient multi-process runtime engine. It orchestrates multiple sandboxed Chrome instances, enabling robust and scalable browser automation.
-   **AI-Driven Workflow Orchestration** 🧠: Designed to integrate seamlessly with LLMs and AI Agents, facilitating the creation, management, and execution of sophisticated, AI-driven automation workflows.
-   **Modular & Extensible Worklets** 🧩: Leverage Worklets as autonomous, reusable, and highly composable code blocks for specific tasks, allowing for flexible and extensible automation solutions.
-   **Comprehensive REST API Control** 🔗: Offers a full-featured REST API for programmatic control over every aspect of the browser environment, including sessions, pages, flows, and individual browser actions.
-   **Parallel & Isolated Session Execution** ⚡: Manages multiple independent browser sessions in parallel, each running in a sandboxed Chrome instance with isolated contexts (cookies, local storage), ensuring tasks run without interference.
-   **Rich & Granular Action Space** 🤖: Provides a wide array of built-in, low-level browser actions—from navigation and clicking to executing custom JavaScript—offering precise control over browser interactions.

## Architecture 🏗️

```mermaid
graph TD
    subgraph Intelligence Layer
        M[LLM]
        A[AI Agents]
    end
    M <--> A
    
    APIS -- Exposes --> APIList[/api/session/<br>/api/flow/<br>/api/browser/]

    subgraph Wyse Browser
        B(RunTime)
        C{Workflow}
        AS[Browser Actions]
        APIS[API Service]
    end

    subgraph "(Playwright)"
        BIs[Chrome Instances]
    end
  
    A <--> B
    B <--> APIS
    B --> C
    B --> AS
    
    B -- Manages --> BIs

    AL[visit, history, search, refresh_page<br/>click, click_full, double_click, text<br/>scroll_up, scroll_down, scroll_element_up, scroll_element_down<br/>scroll_to, wait, key_press, hover<br/>evaluate, init_js, content, create_tab<br/>switch_tab, close_tab, tabs_info, set_content<br/>select_option, drag, screenshot]
    AS --> AL

    AL --> W2[Website2]

    C --> D[Worklet1]
    C --> E[Worklet2]
    C --> F[Worklet3]
    C --> G[Worklet4]
    
    subgraph External Resource
        D
        E
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
    style APIS fill:#E0F2FF,stroke:#3399FF,stroke-width:2px;
    style APIList fill:#FFF,stroke:#333,stroke-width:1px,rx:5px,ry:5px;
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
    style BIs fill:#D5F5E3,stroke:#2ECC71,stroke-width:1px,rx:5px,ry:5px;
```

## Core Concepts ✨

-   **Session** 🌐: A dedicated, isolated browser environment (a sandboxed Chrome instance) that provides a consistent context for executing workflows and browser actions. Each session manages its own cookies, local storage, and pages (tabs), ensuring that automated tasks run without interference from other operations.
-   **Browser Actions** 🤖: The fundamental building blocks for automation within a session. These are low-level, atomic operations that can be executed on a browser page, such as `visit` a URL, `click` an element, `type` text, or `take a screenshot`. These actions are exposed through a comprehensive API, allowing for granular control over browser interactions.
-   **Workflow** 🚀: Defines a precise sequence of worklets executed in a specific order. Workflows are designed and created by AI agents to automate complex multi-step tasks within the browser. Each workflow maintains isolated data connections and state, ensuring independent and reliable execution.
-   **Worklet** 🧩: A reusable, autonomous, and highly composable code block dedicated to performing a specific task. Worklets act as the modular units of automation, encapsulating logic for interactions with external resources or complex browser operations. They can be implemented in various languages and function as local processes or remote services, allowing for flexible and extensible automation.


## Getting Started 🏁

### Prerequisites 🛠️

- Node.js (v20.x or later)
- pnpm

### Installation ⬇️

1.  Clone the repository:
    ```bash
    git clone https://github.com/wyse-work/wyse-browser.git
    cd wyse-browser
    ```

2.  Navigate to the browser engine directory and install dependencies:
    ```bash
    cd browser
    pnpm install
    ```

3.  Build all worklets:
    ```bash
    ./build_worklets.sh
    ```

4.  Run the API development server:
    ```bash
    pnpm run start:dev
    ```
    The API server will be running at `http://127.0.0.1:13100`.

## Quick Start: Usage Example ⚡

Here's a quick example of how to use `curl` to create a session, navigate to a page, and take a screenshot.

1.  **Create a new session:**
    ```bash
    SESSION_ID=$(curl -s -X POST http://127.0.0.1:13100/api/session/create \\
    -H "Content-Type: application/json" \\
    -d '{}' | grep -o '\"session_id\":\"[^\"]*\' | cut -d\'\"\' -f4)

    echo "Session created with ID: $SESSION_ID"
    ```

2.  **Perform a "visit" action:**
    ```bash
    curl -X POST http://127.0.0.1:13100/api/browser/action \\\
    -H "Content-Type: application/json" \\\
    -d \'{\n      \"session_id\": \"\'\"$SESSION_ID\"\'\",\n      \"action_name\": \"visit\",\n      \"data\": { \"url\": \"https://www.google.com\" }\n    }\'
    ```

3.  **Take a screenshot:**
    ```bash
    curl -X GET http://127.0.0.1:13100/api/session/$SESSION_ID/screenshot
    ```

## API Reference 📚

Please refer to [API_REFERENCE.md](API_REFERENCE.md) for the complete API reference.

## Contributing 🤝

Contributions are welcome! Please feel free to submit a pull request.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.


