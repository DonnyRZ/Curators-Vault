# Curator's Vault MVP Generator

A desktop application built with Electron and the Gemini CLI to generate MVPs (Minimum Viable Products) from mockups, features, and rules.

## Overview

The Curator's Vault MVP Generator is a tool that streamlines the process of turning design mockups into functional web applications. By leveraging the power of the Gemini CLI for AI-driven code generation, this application allows users to:

1. Define a project workspace
2. Upload design mockups
3. Map features to each mockup
4. Set project-wide rules and constraints
5. Automatically generate a complete Single Page Application (SPA)

## Project Structure

```
MVP-01/
├── src/
│   ├── main/
│   │   ├── main.js          # Electron main process entry point
│   │   ├── preload.js       # Secure IPC bridge
│   │   ├── ipc-handlers.js  # Handles Electron IPC messages
│   │   └── server.js        # Express server for core logic and Gemini CLI interaction
│   ├── renderer/
│   │   ├── index.html       # Main UI HTML
│   │   ├── renderer.js      # Frontend application logic
│   │   └── styles.css       # Application styling
│   └── prompts/
│       ├── planning-prompt.yaml  # Prompt for the planning stage
│       ├── build-prompt.yaml     # Prompt for the build stage
│       └── default-rules.json    # Default project rules
├── package.json             # Project metadata and dependencies
├── forge.config.js          # Electron Forge configuration
└── .gitignore               # Git ignore rules
```

## Key Features

1.  **Workspace Management**: Create or select a project workspace where all files will be generated.
2.  **Mockup Organization**: Upload and manage design mockups with automatic organization into numbered folders.
3.  **Feature Mapping**: Define features for each mockup with a structured form interface.
4.  **Rule Definition**: Set project-wide rules that guide the code generation process.
5.  **Two-Stage Generation**:
    *   **Planning**: AI analyzes inputs and creates a development plan.
    *   **Building**: AI implements the plan to generate the actual SPA code.
6.  **Progress Monitoring**: Real-time output display during the generation process.
7.  **Live Preview**: Instantly preview the generated MVP with hot-reload capabilities.

## Technology Stack

*   **Electron**: For building the cross-platform desktop application.
*   **Node.js / Express**: For the backend server that orchestrates the generation process.
*   **Gemini CLI**: For AI-powered code generation.
*   **HTML/CSS/JavaScript**: For the frontend user interface.
*   **AJV**: For JSON schema validation of project rules and features.
*   **Chokidar**: For file watching to enable live preview.

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd MVP-01
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Ensure you have the Gemini CLI installed. If not, install it globally:
    ```bash
    npm install -g @google/gemini-cli
    ```

## Usage

1.  Start the application in development mode:
    ```bash
    npm start
    ```
2.  Follow the in-app workflow:
    *   **Workspace Setup**: Choose or create a workspace directory.
    *   **Mockups Manager**: Upload your design mockups.
    *   **Feature Mapping**: Define features for each mockup.
    *   **Project Rules**: Set project constraints and technology preferences.
    *   **Generate & Monitor**: Start the AI-powered generation process and monitor progress.
    *   **Live Preview**: View and interact with the generated MVP.

## Development Workflow

1.  The application uses Electron Forge for packaging. To package the app for your current platform:
    ```bash
    npm run make
    ```
2.  Linting and formatting are handled by ESLint and Prettier:
    ```bash
    npm run lint
    npm run format
    ```

## Architecture

The application follows a client-server architecture within the Electron framework:

1.  **Renderer Process**: The frontend UI built with HTML, CSS, and JavaScript. It communicates with the main process via IPC.
2.  **Main Process**: The Electron main process handles window creation, IPC message routing, and spawning the backend server.
3.  **Backend Server**: An Express server that handles the core application logic, including:
    *   Workspace management
    *   Mockup processing and organization
    *   Feature and rule handling
    *   Interaction with the Gemini CLI for code generation
    *   File system operations
4.  **Gemini CLI**: An external AI tool that performs the actual code generation based on prompts provided by the backend server.

## Prompts

The application uses two main prompts for the Gemini CLI:

1.  **Planning Prompt** (`src/prompts/planning-prompt.yaml`): Guides the AI in creating a development plan based on the project inputs.
2.  **Build Prompt** (`src/prompts/build-prompt.yaml`): Guides the AI in implementing the development plan to generate the actual code.

These prompts are designed to produce high-quality, maintainable code that adheres to the specified project rules and constraints.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## License

[MIT](LICENSE)