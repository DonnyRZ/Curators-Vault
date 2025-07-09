// frontend/main.js (Electron's main process)

const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs').promises; // Use the promise-based version of fs
const path = require('path');
const { spawn } = require('child_process');

let pythonProcess = null;

// --- Step 1: Start the Python Backend ---
const startPythonBackend = async () => {
    const backendPath = path.join(__dirname, '..', 'backend', 'server.py');
    const pythonEnvPath = path.join(__dirname, '..', 'backend', 'curators_venv', 'bin', 'python');

    const pythonLogDir = path.join(app.getPath('userData'), 'python_logs');
    await fs.mkdir(pythonLogDir, { recursive: true });

    const stdoutLogPath = path.join(pythonLogDir, 'python_stdout.log');
    const stderrLogPath = path.join(pythonLogDir, 'python_stderr.log');

    const pythonStdout = await fs.open(stdoutLogPath, 'a');
    const pythonStderr = await fs.open(stderrLogPath, 'a');

    console.log(`Starting Python backend: ${pythonEnvPath} ${backendPath}`);

    pythonProcess = spawn(pythonEnvPath, [backendPath], {
        detached: true,
        stdio: ['ignore', pythonStdout.fd, pythonStderr.fd],
        shell: true
    });

    pythonProcess.unref();

    pythonProcess.on('close', async (code) => {
        console.log(`Python process exited with code ${code}`);
        pythonProcess = null;
        await pythonStdout.close();
        await pythonStderr.close();
    });

    pythonProcess.on('error', (err) => {
        console.error('Failed to start Python process.', err);
    });
};

// --- Step 2: Create the Electron Window ---
const createWindow = () => {
    const win = new BrowserWindow({
        width: 900,
        height: 720,
        title: "The Curator's Atlas", // Set our app's title
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // For secure communication
            nodeIntegration: false, // Security: Important!
            contextIsolation: true, // Security: Important!
        },
    });

    // Load our main HTML file
    win.loadFile('index.html');
};

// --- Step 4: Handle Electron App Lifecycle ---
app.whenReady().then(async () => {
    // Ensure the .curators-atlas directory and projects.json file exist
    const ensureProjectFileExists = async () => {
        const homeDir = app.getPath('home');
        const curatorsAtlasDir = path.join(homeDir, '.curators-atlas');
        const projectsFilePath = path.join(curatorsAtlasDir, 'projects.json');

        try {
            await fs.mkdir(curatorsAtlasDir, { recursive: true });
            console.log(`Ensured directory: ${curatorsAtlasDir}`);
        } catch (error) {
            console.error(`Error ensuring directory ${curatorsAtlasDir}:`, error);
        }

        try {
            await fs.access(projectsFilePath);
            console.log(`projects.json already exists at: ${projectsFilePath}`);
        } catch (error) {
            // File does not exist, create it
            try {
                await fs.writeFile(projectsFilePath, '[]', { encoding: 'utf8' });
                console.log(`Created empty projects.json at: ${projectsFilePath}`);
            } catch (writeError) {
                console.error(`Error creating projects.json at ${projectsFilePath}:`, writeError);
            }
        }
    };

    await ensureProjectFileExists(); // Ensure projects.json exists before starting backend or creating window
    startPythonBackend(); // Start the Python server first
    createWindow(); // Then create the window

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // On macOS, it's common for applications and their menu bar to stay active
    // until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    // Terminate the Python process when Electron app quits
    if (pythonProcess) {
        console.log('Terminating Python backend...');
        pythonProcess.kill(); // Send SIGTERM to the process
    }
});

// --- Step 5: Handle IPC (Inter-Process Communication) from Renderer ---
// These are the actual implementations of the functions exposed by preload.js
ipcMain.handle('open-directory-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (canceled) {
        return undefined; // Return undefined if canceled
    } else {
        return filePaths[0]; // Return the selected directory path
    }
});

// Implement handlers for fs and path operations
ipcMain.handle('read-text-file', async (event, filePath) => {
    try {
        return require('fs').promises.readFile(filePath, 'utf8');
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
});

ipcMain.handle('write-text-file', async (event, filePath, content) => {
    try {
        await require('fs').promises.writeFile(filePath, content, 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing file:', error);
        throw error;
    }
});

ipcMain.handle('create-directory', async (event, dirPath) => {
    try {
        await require('fs').promises.mkdir(dirPath, { recursive: true });
        return true;
    } catch (error) {
        console.error('Error creating directory:', error);
        throw error;
    }
});

ipcMain.handle('check-exists', async (event, filePath) => {
    try {
        await require('fs').promises.access(filePath);
        return true;
    } catch (error) {
        return false;
    }
});

ipcMain.handle('get-home-dir', async () => {
    return app.getPath('home');
});

ipcMain.handle('path-join', async (event, ...args) => {
    return path.join(...args);
});

// IPC handler to read projects.json
ipcMain.handle('read-projects-file', async () => {
    const homeDir = app.getPath('home');
    const projectsFilePath = path.join(homeDir, '.curators-atlas', 'projects.json');
    try {
        const content = await fs.readFile(projectsFilePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('Error reading projects.json:', error);
        return []; // Return empty array if file doesn't exist or is malformed
    }
});

// IPC handler to write to projects.json
ipcMain.handle('write-projects-file', async (event, projects) => {
    const homeDir = app.getPath('home');
    const projectsFilePath = path.join(homeDir, '.curators-atlas', 'projects.json');
    try {
        await fs.writeFile(projectsFilePath, JSON.stringify(projects, null, 2), 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Error writing projects.json:', error);
        return { success: false, error: error.message };
    }
});

// IPC handler to read all enriched repos from the armory directory
ipcMain.handle('read-all-enriched-repos', async () => {
    const homeDir = app.getPath('home');
    const armoryDir = path.join(homeDir, '.curators-atlas', 'armory');
    const enrichedRepos = [];

    try {
        await fs.access(armoryDir); // Check if directory exists
        const files = await fs.readdir(armoryDir);
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(armoryDir, file);
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    enrichedRepos.push(JSON.parse(content));
                } catch (readError) {
                    console.error(`Error reading or parsing armory file ${filePath}:`, readError);
                }
            }
        }
    } catch (dirError) {
        // Directory does not exist, return empty array
        console.log(`Armory directory not found: ${armoryDir}. Returning empty list.`);
    }
    return enrichedRepos;
});

// IPC handler to get Ollama models
ipcMain.handle('get-ollama-models', async () => {
    try {
        const response = await fetch('http://127.0.0.1:5001/api/get_ollama_models');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch Ollama models');
        }
        return await response.json();
    } catch (error) {
        console.error('Error getting Ollama models:', error);
        throw error;
    }
});

// IPC handler to set the LLM model
ipcMain.handle('set-llm-model', async (event, modelName) => {
    try {
        const response = await fetch('http://127.0.0.1:5001/api/set_llm_model', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model_name: modelName }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to set LLM model');
        }
        return await response.json();
    } catch (error) {
        console.error('Error setting LLM model:', error);
        throw error;
    }
});