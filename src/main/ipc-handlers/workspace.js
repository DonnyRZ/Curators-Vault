/**
 * Workspace IPC Handlers
 * Handles all workspace-related IPC communication
 */

const { ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const state = require('../state');

// --- Utility Functions (originally from server/utils.js) ---

async function checkGeminiCLI() {
  return new Promise((resolve) => {
    const geminiVersion = spawn('gemini', ['--version'], { shell: true });
    let versionOutput = '';
    geminiVersion.on('close', (code) => {
      if (code === 0) {
        const helpProcess = spawn('gemini', ['--help'], { shell: true });
        let helpOutput = '';
        helpProcess.stdout.on('data', (data) => { helpOutput += data.toString(); });
        helpProcess.on('close', (helpCode) => {
          resolve({
            installed: true,
            version: versionOutput.trim(),
            yoloSupported: helpCode === 0 && helpOutput.includes('--yolo'),
          });
        });
      } else {
        resolve({ installed: false, version: null, yoloSupported: false });
      }
    });
    geminiVersion.stdout.on('data', (data) => { versionOutput += data.toString(); });
    geminiVersion.on('error', () => resolve({ installed: false, version: null, yoloSupported: false }));
  });
}

async function checkWritePermissions(dirPath) {
  try {
    await fs.access(dirPath, fsSync.constants.W_OK);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Register workspace-related IPC handlers
 * @param {Electron.BrowserWindow} win – main BrowserWindow
 */
function registerWorkspaceHandlers(win) {
  ipcMain.handle('workspace:select', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
    });
    if (canceled || !filePaths || filePaths.length === 0) {
      return undefined;
    }
    state.workspacePath = filePaths[0];
    return state.workspacePath;
  });

  ipcMain.handle('workspace:create', async (event, workspacePath) => {
    try {
      await fs.mkdir(workspacePath, { recursive: true });
      const rulesPath = path.join(workspacePath, 'rules.json');
      try {
        await fs.access(rulesPath);
      } catch (err) {
        const defaultRules = {
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
        await fs.writeFile(rulesPath, JSON.stringify(defaultRules, null, 2));
      }
      state.workspacePath = workspacePath;
      return { success: true, message: 'Workspace initialized' };
    } catch (error) {
      console.error('[IPC] Error creating workspace:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('workspace:check-preconditions', async (event, workspacePath) => {
    if (!workspacePath) {
      return { error: 'Workspace path is required' };
    }
    try {
      const geminiCheck = await checkGeminiCLI();
      const writePermission = await checkWritePermissions(workspacePath);
      return {
        geminiInstalled: geminiCheck.installed,
        yoloSupported: geminiCheck.yoloSupported,
        writePermissions: writePermission
      };
    } catch (error) {
      console.error('[IPC] Error checking preconditions:', error);
      return { success: false, error: error.message };
    }
  });
  
  // New handler to get the workspace path
  ipcMain.handle('workspace:get-path', async () => {
    return state.workspacePath || null;
  });

  // Workspace stats: pages count, features count, last plan/build
  ipcMain.handle('workspace:stats', async () => {
    const result = { pages: 0, features: 0, lastPlanAt: null, lastBuildAt: null };
    try {
      if (!state.workspacePath) return result;
      const entries = await fs.readdir(state.workspacePath, { withFileTypes: true });
      const pageDirs = entries.filter(e => e.isDirectory() && /^page-\d+$/.test(e.name));
      result.pages = pageDirs.length;
      for (const dir of pageDirs) {
        try {
          const featuresPath = path.join(state.workspacePath, dir.name, 'features.json');
          const featuresData = await fs.readFile(featuresPath, 'utf8');
          const arr = JSON.parse(featuresData);
          if (Array.isArray(arr)) result.features += arr.length;
        } catch {
          // Skip this directory if features.json cannot be read or parsed
        }
      }
      // lastPlanAt from development_phases.txt mtime
      try {
        const planStat = await fs.stat(path.join(state.workspacePath, 'development_phases.txt'));
        result.lastPlanAt = planStat.mtimeMs;
      } catch {
        // Ignore if development_phases.txt doesn't exist
      }
      // lastBuildAt from index.html mtime
      try {
        const buildStat = await fs.stat(path.join(state.workspacePath, 'index.html'));
        result.lastBuildAt = buildStat.mtimeMs;
      } catch {
        // Ignore if index.html doesn't exist
      }
    } catch (e) {
      // swallow; return what we have
    }
    return result;
  });
}

module.exports = { registerWorkspaceHandlers };
