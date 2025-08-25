/**
 * Generation IPC Handlers
 * Handles all generation-related IPC communication, now including the core logic.
 */

const { ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const state = require('../state');
let currentChild = null;

/**
 * Runs a generation phase (Planning or Building) using the Qwen Code CLI.
 * @param {Electron.BrowserWindow} win - The main browser window to send output to.
 * @param {string} phase - The name of the phase ('Planning' or 'Building').
 * @param {string} promptPath - The absolute path to the prompt file.
 * @param {object} promptData - The data to inject into the prompt.
 * @param {string} [outputFilePath] - Optional. If provided, stdout will be written to this file.
 */
function runGenerationPhase(win, phase, promptPath, promptData, outputFilePath) {
  return new Promise((resolve, reject) => {
    const sendOutput = (data) => win.webContents.send('generate:output', data);
    sendOutput(`[${phase}] Starting...`);

    // Normalize the workspace path to avoid issues with spaces and special characters
    const normalizedWorkspacePath = path.resolve(state.workspacePath);
    sendOutput(`[${phase}] Using workspace path: ${normalizedWorkspacePath}`);

    const tempPromptFilename = `.tmp-prompt-${phase.toLowerCase()}.yaml`;
    const tempPromptPath = path.join(normalizedWorkspacePath, tempPromptFilename);

    fs.readFile(promptPath, 'utf-8')
      .then(promptContent => {
        for (const key in promptData) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          let dataString = typeof promptData[key] === 'string' ? promptData[key] : JSON.stringify(promptData[key], null, 2);
          promptContent = promptContent.replace(regex, dataString);
        }
        return fs.writeFile(tempPromptPath, promptContent);
      })
      .then(() => {
        sendOutput(`[${phase}] Created temporary prompt file at ${tempPromptPath}`);
        
        // Use a more robust approach for the prompt path
        const quotedPromptPath = `"${tempPromptFilename}"`;
        const args = ['-p', `@${quotedPromptPath}`, '--model', 'qwen3-coder-plus', '--yolo'];
        sendOutput(`[${phase}] Running command: qwen ${args.join(' ')}`);
        sendOutput(`[${phase}] Working directory: ${normalizedWorkspacePath}`);
        
        // Use the normalized workspace path as the cwd
        const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        const child = spawn(bin, ['@qwen-code/qwen-code@latest', ...args], {
          cwd: normalizedWorkspacePath, 
          shell: true,
          windowsVerbatimArguments: true  // This might help with Windows path issues
        });
        currentChild = child;

        let stdoutBuffer = '';
        child.stdout.on('data', (data) => {
          const text = data.toString();
          sendOutput(text);
          stdoutBuffer += text;
        });
        
        child.stderr.on('data', (data) => {
          const text = data.toString();
          sendOutput(`[${phase}] STDERR: ${text}`);
        });

        const writePromise = new Promise((resolveWrite, rejectWrite) => {
          child.stdout.on('end', () => {
            if (outputFilePath) {
              fs.writeFile(outputFilePath, stdoutBuffer)
                .then(() => {
                  sendOutput(`[${phase}] Output saved to ${outputFilePath}`);
                  resolveWrite();
                })
                .catch((error) => {
                  rejectWrite(new Error(`Failed to save output for ${phase}: ${error.message}`));
                });
            } else {
              resolveWrite();
            }
          });
        });

        child.on('close', (code) => {
          fs.unlink(tempPromptPath)
            .then(() => {
              sendOutput(`[${phase}] Cleaned up temporary prompt file`);
            })
            .catch(e => {
              sendOutput(`[${phase}] Warning: Could not clean up temporary prompt file: ${e.message}`);
            })
            .finally(() => {
              currentChild = null;
              if (code === 0) {
                writePromise.then(() => {
                  sendOutput(`[${phase}] Completed successfully.`);
                  resolve();
                }).catch(reject);
              } else {
                reject(new Error(`[${phase}] Failed with exit code ${code}.`));
              }
            });
        });

        child.on('error', (err) => {
          sendOutput(`[${phase}] Process error: ${err.message}`);
          currentChild = null;
          reject(err);
        });
      })
      .catch(error => {
        reject(new Error(`Failed to create temp prompt for ${phase}: ${error.message}`));
      });
  });
}

/**
 * Register generation-related IPC handlers
 * @param {Electron.BrowserWindow} win – main BrowserWindow
 */
function registerGenerationHandlers(win) {
  ipcMain.handle('generate:start', async () => {
    if (!state.workspacePath) return { success: false, error: 'Workspace not initialized' };
    if (state.generationInProgress) return { success: false, error: 'Generation already in progress' };

    state.generationInProgress = true;
    const sendOutput = (msg) => win.webContents.send('generate:output', msg);
    const sendError = (msg) => win.webContents.send('generate:error', msg);

    try {
      // Normalize the workspace path
      const normalizedWorkspacePath = path.resolve(state.workspacePath);
      state.workspacePath = normalizedWorkspacePath;
      sendOutput(`[Info] Using normalized workspace path: ${normalizedWorkspacePath}`);

      sendOutput('[Info] Gathering project data...');
      const promptsPath = path.resolve(__dirname, '..', '..', 'prompts');
      sendOutput(`[Info] Prompts path: ${promptsPath}`);
      
      // Check if prompts exist
      try {
        await fs.access(path.join(promptsPath, 'planning-prompt.yaml'));
        await fs.access(path.join(promptsPath, 'build-prompt.yaml'));
        sendOutput('[Info] Prompt files found');
      } catch (e) {
        throw new Error(`Prompt files not found in ${promptsPath}`);
      }

      const rulesPath = path.join(normalizedWorkspacePath, 'rules.json');
      sendOutput(`[Info] Rules path: ${rulesPath}`);
      
      let rules = {};
      try {
        const rulesData = await fs.readFile(rulesPath, 'utf8');
        rules = JSON.parse(rulesData);
        sendOutput('[Info] Rules loaded successfully');
      } catch (e) {
        sendOutput(`[Info] Warning: Could not load rules.json, using default rules`);
        rules = {
          appType: "SPA",
          language: "javascript-vanilla",
          typescript: false,
          html: true,
          css: true,
          constraints: [
            "single index.html at root",
            "multiple JS/CSS files allowed",
            "no frameworks by default"
          ]
        };
      }
      
      const pageDirs = (await fs.readdir(normalizedWorkspacePath, { withFileTypes: true }))
        .filter(d => d.isDirectory() && /^page-\d+$/.test(d.name)).map(d => d.name);
      
      sendOutput(`[Info] Found page directories: ${pageDirs.join(', ')}`);

      let features = {};
      for (const dir of pageDirs) {
        try {
          const featuresPath = path.join(normalizedWorkspacePath, dir, 'features.json');
          sendOutput(`[Info] Loading features from: ${featuresPath}`);
          const featuresData = await fs.readFile(featuresPath, 'utf8');
          features[dir] = JSON.parse(featuresData);
          sendOutput(`[Info] Loaded ${features[dir].length} features for ${dir}`);
        } catch (e) {
          sendOutput(`[Info] Warning: Could not load features for ${dir}: ${e.message}`);
        }
      }
      sendOutput('[Info] Project data gathered.');

      // --- Planning Stage ---
      const devPlanPath = path.join(normalizedWorkspacePath, 'development_phases.txt');
      sendOutput(`[Info] Development plan will be saved to: ${devPlanPath}`);
      
      try {
        await runGenerationPhase(win, 'Planning', path.join(promptsPath, 'planning-prompt.yaml'), {
          workspace_path: normalizedWorkspacePath,
          project_rules: rules,
          pages_and_features: features
        }, devPlanPath);
        sendOutput('[Info] Planning stage completed successfully');
      } catch (error) {
        sendError(`Planning stage failed: ${error.message}`);
        throw error;
      }

      // --- Check if development plan was created ---
      try {
        await fs.access(devPlanPath);
        sendOutput('[Info] Development plan file found');
        
        const devPlan = await fs.readFile(devPlanPath, 'utf-8');
        sendOutput(`[Info] Development plan content length: ${devPlan.length} characters`);
        
        if (devPlan.trim().length === 0) {
          throw new Error('Development plan is empty');
        }
      } catch (error) {
        sendError(`Development plan check failed: ${error.message}`);
        throw new Error(`Development plan was not created properly: ${error.message}`);
      }

      // --- Building Stage ---
      sendOutput('[Info] Starting building stage...');
      try {
        const devPlan = await fs.readFile(devPlanPath, 'utf-8');
        
        await runGenerationPhase(win, 'Building', path.join(promptsPath, 'build-prompt.yaml'), {
          workspace_path: normalizedWorkspacePath,
          development_phases: devPlan,
          project_rules: rules,
          page_features: features
        });
        sendOutput('[Info] Building stage completed successfully');
        // Notify renderer to reload any preview frames
        try { win.webContents.send('preview:reload'); } catch (e) { 
          // Ignore errors when sending preview reload message
        }
      } catch (error) {
        sendError(`Building stage failed: ${error.message}`);
        throw error;
      }

      state.generationInProgress = false;
      sendOutput('[Info] Generation completed successfully!');
      return { success: true };

    } catch (error) {
      console.error('[IPC] Error during generation:', error);
      sendError(`Generation failed: ${error.message}`);
      state.generationInProgress = false;
      return { success: false, error: error.message };
    }
  });

  // Run Planning only
  ipcMain.handle('generate:plan', async () => {
    if (!state.workspacePath) return { success: false, error: 'Workspace not initialized' };
    if (state.generationInProgress) return { success: false, error: 'Generation already in progress' };
    state.generationInProgress = true;
    const sendOutput = (msg) => win.webContents.send('generate:output', msg);
    try {
      const normalizedWorkspacePath = path.resolve(state.workspacePath);
      const promptsPath = path.resolve(__dirname, '..', '..', 'prompts');
      const rulesPath = path.join(normalizedWorkspacePath, 'rules.json');
      let rules = {};
      try { rules = JSON.parse(await fs.readFile(rulesPath, 'utf8')); } catch { 
        // Use default rules if file cannot be read or parsed
        rules = {}; 
      }
      const pageDirs = (await fs.readdir(normalizedWorkspacePath, { withFileTypes: true }))
        .filter(d => d.isDirectory() && /^page-\d+$/.test(d.name)).map(d => d.name);
      const features = {};
      for (const dir of pageDirs) {
        try { features[dir] = JSON.parse(await fs.readFile(path.join(normalizedWorkspacePath, dir, 'features.json'), 'utf8')); } catch {
          // Skip features for this page if file cannot be read or parsed
        }
      }
      const devPlanPath = path.join(normalizedWorkspacePath, 'development_phases.txt');
      await runGenerationPhase(win, 'Planning', path.join(promptsPath, 'planning-prompt.yaml'), {
        workspace_path: normalizedWorkspacePath,
        project_rules: rules,
        pages_and_features: features
      }, devPlanPath);
      state.generationInProgress = false;
      return { success: true, devPlanPath };
    } catch (error) {
      win.webContents.send('generate:error', `Planning failed: ${error.message}`);
      state.generationInProgress = false;
      return { success: false, error: error.message };
    }
  });

  // Run Building only
  ipcMain.handle('generate:build', async () => {
    if (!state.workspacePath) return { success: false, error: 'Workspace not initialized' };
    if (state.generationInProgress) return { success: false, error: 'Generation already in progress' };
    state.generationInProgress = true;
    const sendOutput = (msg) => win.webContents.send('generate:output', msg);
    try {
      const normalizedWorkspacePath = path.resolve(state.workspacePath);
      const promptsPath = path.resolve(__dirname, '..', '..', 'prompts');
      const rulesPath = path.join(normalizedWorkspacePath, 'rules.json');
      let rules = {};
      try { rules = JSON.parse(await fs.readFile(rulesPath, 'utf8')); } catch { rules = {}; }
      const pageDirs = (await fs.readdir(normalizedWorkspacePath, { withFileTypes: true }))
        .filter(d => d.isDirectory() && /^page-\d+$/.test(d.name)).map(d => d.name);
      const features = {};
      for (const dir of pageDirs) {
        try { features[dir] = JSON.parse(await fs.readFile(path.join(normalizedWorkspacePath, dir, 'features.json'), 'utf8')); } catch {
          // Skip features for this page if file cannot be read or parsed
        }
      }
      const devPlanPath = path.join(normalizedWorkspacePath, 'development_phases.txt');
      try { await fs.access(devPlanPath); }
      catch { throw new Error('Development plan not found. Run Planning first.'); }

      const devPlan = await fs.readFile(devPlanPath, 'utf-8');
      await runGenerationPhase(win, 'Building', path.join(promptsPath, 'build-prompt.yaml'), {
        workspace_path: normalizedWorkspacePath,
        development_phases: devPlan,
        project_rules: rules,
        page_features: features
      });
      try { win.webContents.send('preview:reload'); } catch { 
        // Ignore errors when sending preview reload message
      }
      state.generationInProgress = false;
      return { success: true };
    } catch (error) {
      win.webContents.send('generate:error', `Building failed: ${error.message}`);
      state.generationInProgress = false;
      return { success: false, error: error.message };
    }
  });

  // Stop current generation if possible
  ipcMain.handle('generate:stop', async () => {
    try {
      if (currentChild) {
        currentChild.kill('SIGTERM');
        currentChild = null;
        state.generationInProgress = false;
        return { success: true, message: 'Generation stopped' };
      }
      return { success: false, error: 'No generation in progress' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerGenerationHandlers };
