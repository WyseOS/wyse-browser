# Web

This directory contains the frontend web application for Wyse Browser, built with React, TypeScript, and Vite. It serves as a visual interface for managing and interacting with various automated flows and worklets.

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Application Structure](#application-structure)
- [Core Functionality](#core-functionality)
  - [Flow Management](#flow-management)
  - [Worklet Management](#worklet-management)
  - [React Flow Integration](#react-flow-integration)
  - [State Management](#state-management)
- [Development Setup](#development-setup)
- [Linting Configuration](#linting-configuration)

## Project Overview

The Wyse web application provides a graphical user interface (GUI) for users to visualize, create, and manage automated workflows (referred to as "flows"). These flows are composed of individual "worklets," which are modular, reusable automation tasks. The application fetches available flows and worklets from a backend API and presents them in an interactive drag-and-drop environment powered by React Flow. Users can select and view existing flows, and potentially create new ones by dragging worklets onto the canvas and connecting them.

## Tech Stack

The frontend application is built using the following key technologies:

- **React**: A JavaScript library for building user interfaces.
- **TypeScript**: A superset of JavaScript that adds static typing, enhancing code quality and maintainability.
- **Vite**: A fast build tool that provides an optimized development experience for modern web projects.
- **Material UI (MUI)**: A comprehensive suite of UI tools for faster and easier web development, providing pre-built and customizable React components.
- **Zustand**: A small, fast, and scalable bearbones state-management solution for React. It's used here for global state management of application data like flows and worklets.
- **React Flow**: A library for building node-based editors and interactive diagrams. It's central to visualizing and interacting with the flows.
- **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs. It's integrated for styling components.
- **Axios**: A promise-based HTTP client for the browser and Node.js, used for making API requests to the backend.
- **uuid**: A library for generating universally unique identifiers.
- **lodash**: A modern JavaScript utility library delivering modularity, performance, and extras. Used for utility functions like `isArray`, `isObject`, and `isEmpty`.

## Application Structure

The `web` directory is organized as follows:

- `public/`: Contains static assets like `vite.svg`.
- `src/`: The main source code directory.
  - `api/`: Contains utility functions for API calls, such as `fetchProvider` and `getApi`.
  - `assets/`: Stores static assets used within the application, e.g., `react.svg`.
  - `components/`: Reusable React components.
    - `base-handle.tsx`: A base component for custom handles in React Flow.
    - `base-node.tsx`: A base component for custom nodes in React Flow.
    - `database-schema-node.tsx`: A specific React Flow node type used to display worklets and their actions (schema).
    - `ui/`: UI components from `shadcn/ui`, such as `table.tsx`.
    - `labeled-handle.tsx`: A handle component with a label, used within `database-schema-node`.
  - `flows/`: Contains manifest files for predefined flows. Each flow has its own subdirectory with a `manifest.json` defining its structure and connections.
  - `lib/`: Utility functions, such as `cn` for concatenating Tailwind CSS classes.
  - `store/`: Zustand store for global application state.
    - `global.ts`: Defines the main Zustand store for `flows` and `worklets`.
    - `updater.ts`: A React component responsible for fetching initial flow and worklet data from the backend and updating the Zustand store.
  - `utills/`: General utility functions.
  - `worklets/`: Contains manifest files for individual worklets, similar to `flows`. Each worklet has a `manifest.json` detailing its actions and properties.
  - `App.tsx`: The main application component, responsible for rendering the React Flow canvas and the worklet sidebar. It handles loading flows, adding worklets via drag-and-drop, and managing node and edge states.
  - `main.tsx`: The entry point of the React application, responsible for rendering the `App` component and setting up `React Query` and `Zustand`.
  - `worklesMap.ts`: A helper file that pre-processes and structures worklet manifest data for use within the React Flow components. It maps worklet actions to the `databaseSchema` node type.
- `index.css`: Global CSS file, including Tailwind CSS directives and custom CSS variables for theming.
- `package.json`: Defines project metadata, dependencies, and scripts.
- `postcss.config.js`: PostCSS configuration for Tailwind CSS.
- `tailwind.config.js`: Tailwind CSS configuration for customizing design tokens and plugins.
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`: TypeScript configuration files.
- `vite.config.ts`: Vite build configuration, including proxy settings for the backend API.

## Core Functionality

### Flow Management

The application fetches flow definitions from the backend API. These definitions, found in `web/src/flows`, describe a sequence of worklets and their connections. The `App.tsx` component processes this data, transforming it into `ReactFlow` compatible nodes and edges for visualization on the canvas. Users can select different flows from a dropdown to load them onto the canvas.

### Worklet Management

Worklets, defined in `web/src/worklets`, represent individual, atomic automation tasks. The application fetches these worklet definitions and displays them in a sidebar. Users can drag these worklets from the sidebar onto the React Flow canvas. The `handleDragItem` function in `App.tsx` is responsible for creating a new node on the canvas when a worklet is dropped, using `uuidv4()` to generate unique IDs and mapping worklet actions to the `databaseSchema` node structure.

### React Flow Integration

`@xyflow/react` is the primary library used for rendering the flow diagrams.
- **Nodes**: Each worklet or flow step is represented as a node. The `DatabaseSchemaNode` component is a custom node type that visually displays the worklet's name and its available actions (input/output parameters).
- **Edges**: Connections between worklets are represented as edges, indicating the flow of data or control. The `onConnect` callback handles the creation of new edges when users connect handles on the nodes.
- **Minimap and Controls**: The `MiniMap` and `Controls` components from `@xyflow/react` provide navigation and zooming capabilities within the flow canvas.

### State Management

Zustand (`web/src/store/global.ts`) is used for managing the global state of the application, specifically `flows` and `worklets`.
- `flows`: An array of all available flow definitions.
- `worklets`: An array of all available worklet definitions.
The `Updater` component (`web/src/store/updater.ts`) is responsible for populating these states by making API calls to the backend (`/api/metadata/list/flow` and `/api/metadata/list/worklet`) upon application load.

## Development Setup

To set up and run the web application locally:

1.  **Install Dependencies**:
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```
2.  **Start Development Server**:
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```
    This will start the Vite development server, usually accessible at `http://localhost:5173`. The `vite.config.ts` includes a proxy to `http://127.0.0.1:13100` for API calls to the backend.

3.  **Build for Production**:
    ```bash
    npm run build
    # or
    yarn build
    # or
    pnpm build
    ```
    This command compiles the application for production, outputting static files to the `dist` directory.

4.  **Preview Production Build**:
    ```bash
    npm run preview
    # or
    yarn preview
    # or
    pnpm preview
    ```
    This command serves the production build locally for testing.

## Linting Configuration

The project uses ESLint with TypeScript and React-specific plugins for code quality and consistency. The configuration is defined in `eslint.config.js`.

-   `@eslint/js`: ESLint's core rules.
-   `typescript-eslint`: Integrates ESLint with TypeScript.
-   `eslint-plugin-react-hooks`: Enforces rules for React Hooks.
-   `eslint-plugin-react-refresh`: Ensures Fast Refresh works correctly.

To run linting:
```bash
npm run lint
# or
yarn lint
# or
pnpm lint
```

For type-aware lint rules, ensure `parserOptions` in `eslint.config.js` is configured to include `tsconfig.node.json` and `tsconfig.app.json` for project references.
