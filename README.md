# Curator's Vault MVP Generator

[![GitHub](https://img.shields.io/github/license/DonnyRZ/Curators-Vault)](https://github.com/DonnyRZ/Curators-Vault/blob/main/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/DonnyRZ/Curators-Vault)](https://github.com/DonnyRZ/Curators-Vault/issues)
[![GitHub stars](https://img.shields.io/github/stars/DonnyRZ/Curators-Vault)](https://github.com/DonnyRZ/Curators-Vault/stargazers)

A desktop application built with Electron and the Gemini CLI to generate MVPs (Minimum Viable Products) from pages, features, and rules.

Repository: https://github.com/DonnyRZ/Curators-Vault

## Overview

The Curator's Vault MVP Generator is a tool that streamlines the process of turning design pages into functional web applications. By leveraging the power of the Gemini CLI for AI-driven code generation, this application allows users to:

1. Define a project workspace
2. Create and manage application pages
3. Map features to each page
4. Set project-wide rules and constraints
5. Automatically generate a complete Single Page Application (SPA)

## Key Features

1.  **Workspace Management**: Create or select a project workspace where all files will be generated.
2.  **Page Management**: Create and manage application pages with automatic organization into numbered folders.
3.  **Feature Mapping**: Define features for each page with a structured form interface.
4.  **Rule Definition**: Set project-wide rules that guide the code generation process.
5.  **Two-Stage Generation**:
    *   **Planning**: AI analyzes inputs and creates a development plan.
    *   **Building**: AI implements the plan to generate the actual SPA code.
6.  **Progress Monitoring**: Real-time output display during the generation process.
7.  **Live Preview**: Instantly preview the generated MVP with hot-reload capabilities.
8.  **Responsive UI**: Modern, professional interface with dark/light theme support.
9.  **Export Functionality**: Package and export your generated projects.

## Technology Stack

*   **Electron**: For building the cross-platform desktop application.
*   **Node.js**: For the backend logic that orchestrates the generation process.
*   **Gemini CLI**: For AI-powered code generation.
*   **HTML/CSS/JavaScript**: For the frontend user interface.
*   **AJV**: For JSON schema validation of project rules and features.
*   **Chokidar**: For file watching to enable live preview.

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/DonnyRZ/Curators-Vault.git
    cd Curators-Vault
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
    *   **Pages Manager**: Create and manage your application pages.
    *   **Feature Mapping**: Define features for each page.
    *   **Project Rules**: Set project constraints and technology preferences.
    *   **Generate & Monitor**: Start the AI-powered generation process and monitor progress.
    *   **Live Preview**: View and interact with the generated MVP.

## Development

### Project Structure

```
Curators-Vault/
├── src/
│   ├── main/
│   │   ├── main.js          # Electron main process entry point
│   │   ├── preload.js       # Secure IPC bridge
│   │   ├── ipc-handlers/    # Handles Electron IPC messages
│   │   │   ├── index.js     # Main IPC handler registration
│   │   │   ├── workspace.js # Workspace-related handlers
│   │   │   ├── pages.js     # Pages-related handlers
│   │   │   ├── features.js  # Features-related handlers
│   │   │   ├── rules.js     # Rules-related handlers
│   │   │   ├── generation.js# Generation-related handlers
│   │   │   └── window.js    # Window-related handlers
│   │   └── state.js         # Application state management
│   ├── renderer/
│   │   ├── index.html       # Main UI HTML
│   │   ├── js/              # Modular frontend application logic
│   │   │   ├── main.js      # Main renderer entry point
│   │   │   ├── router.js    # Hash-based routing
│   │   │   ├── workspace-setup.js # Workspace setup functionality
│   │   │   ├── pages-manager.js   # Pages management functionality
│   │   │   ├── feature-mapping/   # Feature mapping modules
│   │   │   ├── project-rules.js   # Project rules functionality
│   │   │   ├── generate-monitor.js# Generation monitoring functionality
│   │   │   ├── live-preview.js    # Live preview functionality
│   │   │   └── ui/                # UI components
│   │   └── styles/
│   │       └── professional/      # Professional styling
│   └── prompts/
│       ├── planning-prompt.yaml  # Prompt for the planning stage
│       ├── build-prompt.yaml     # Prompt for the build stage
│       └── default-rules.json    # Default project rules
```

### Development Workflow

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

The application follows a modular architecture within the Electron framework:

1.  **Renderer Process**: The frontend UI built with HTML, CSS, and JavaScript, organized into modular components. It communicates with the main process via IPC.
2.  **Main Process**: The Electron main process handles window creation, IPC message routing, and core application logic including:
    *   Workspace management
    *   Page processing and organization
    *   Feature and rule handling
    *   Interaction with the Gemini CLI for code generation
    *   File system operations
3.  **Gemini CLI**: An external AI tool that performs the actual code generation based on prompts provided by the main process.

## Prompts

The application uses two main prompts for the Gemini CLI:

1.  **Planning Prompt** (`src/prompts/planning-prompt.yaml`): Guides the AI in creating a development plan based on the project inputs.
2.  **Build Prompt** (`src/prompts/build-prompt.yaml`): Guides the AI in implementing the development plan to generate the actual code.

These prompts are designed to produce high-quality, maintainable code that adheres to the specified project rules and constraints.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some feature'`)
5. Push to the branch (`git push origin feature/your-feature`)
6. Open a pull request

## License

[MIT](LICENSE)

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/DonnyRZ/Curators-Vault/issues) on GitHub.