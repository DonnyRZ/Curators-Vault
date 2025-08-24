/**
 * Workspace IPC Handlers
 * Handles all workspace-related IPC communication
 */

const { ipcMain, dialog, app } = require('electron');
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

// --- Recent Workspaces Utilities ---
function getRecentsFilePath() {
  try {
    const userData = app.getPath('userData');
    return path.join(userData, 'recent-workspaces.json');
  } catch {
    // Fallback: store in current workspace if userData is not available
    return path.join(process.cwd(), 'recent-workspaces.json');
  }
}

async function readRecentWorkspaces() {
  const file = getRecentsFilePath();
  try {
    const raw = await fs.readFile(file, 'utf8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
    return [];
  } catch {
    return [];
  }
}

async function writeRecentWorkspaces(list) {
  const file = getRecentsFilePath();
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(list, null, 2), 'utf8');
  } catch (e) {
    // swallow
  }
}

async function addRecentWorkspace(dirPath) {
  try {
    const list = await readRecentWorkspaces();
    const filtered = list.filter(p => p !== dirPath);
    filtered.unshift(dirPath);
    const unique = Array.from(new Set(filtered)).slice(0, 10);
    await writeRecentWorkspaces(unique);
  } catch (error) {
    console.warn('Failed to add recent workspace:', error);
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
    await addRecentWorkspace(state.workspacePath);
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
      await addRecentWorkspace(state.workspacePath);
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

  // Recent workspaces list
  ipcMain.handle('workspace:get-recents', async () => {
    try {
      const list = await readRecentWorkspaces();
      // Filter to existing directories
      const existing = [];
      for (const p of list) {
        try {
          const st = await fs.stat(p);
          if (st && st.isDirectory()) existing.push(p);
        } catch (error) {
          console.warn('Failed to stat recent workspace:', error);
        }
      }
      // Persist filtered (in case some were removed)
      await writeRecentWorkspaces(existing);
      return existing;
    } catch (e) {
      return [];
    }
  });

  // Open a specific workspace path (from recents)
  ipcMain.handle('workspace:open', async (event, wsPath) => {
    try {
      if (!wsPath) return { success: false, error: 'Path is required' };
      const st = await fs.stat(wsPath);
      if (!st.isDirectory()) return { success: false, error: 'Path is not a directory' };
      state.workspacePath = wsPath;
      await addRecentWorkspace(wsPath);
      return { success: true, path: wsPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // Auto-open the last recent workspace (if available)
  ipcMain.handle('workspace:auto-open-last', async () => {
    try {
      const list = await readRecentWorkspaces();
      for (const p of list) {
        try {
          const st = await fs.stat(p);
          if (st.isDirectory()) {
            state.workspacePath = p;
            // Ensure default rules exist
            const rulesPath = path.join(p, 'rules.json');
            try {
              await fs.access(rulesPath);
            } catch (error) {
              console.warn('Failed to access rules.json:', error);
              const defaultRules = {
                appType: 'SPA',
                language: 'javascript-vanilla',
                typescript: false,
                html: true,
                css: true,
                constraints: [
                  'single index.html at root',
                  'multiple JS/CSS files allowed',
                  'no frameworks by default'
                ]
              };
              await fs.writeFile(rulesPath, JSON.stringify(defaultRules, null, 2));
            }
            return { success: true, path: p };
          }
        } catch (error) {
          console.warn('Failed to stat recent workspace:', error);
        }
      }
      return { success: false };
    } catch (e) {
      return { success: false, error: e.message };
    }
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

  // Attempt to patch generated project's createElement children handling
  ipcMain.handle('workspace:apply-preview-fix', async () => {
    try {
      if (!state.workspacePath) return { success: false, error: 'No workspace selected' };
      const ws = state.workspacePath;
      const jsMain = path.join(ws, 'js', 'main.js');
      try {
        await fs.access(jsMain);
      } catch {
        return { success: false, error: 'js/main.js not found in workspace' };
      }
      let content = await fs.readFile(jsMain, 'utf8');
      if (content.includes('__cv_origCreate')) {
        return { success: true, message: 'Fix already applied' };
      }
      const patch = `\n\n/* Curator's Vault preview fix: normalize children for createElement */\n(function(){\n  try {\n    const __cv_origCreate = window.createElement;\n    window.createElement = function(tag, attrs, children){\n      const fixed = Array.isArray(children) ? children : (children == null ? [] : [children]);\n      if (typeof __cv_origCreate === 'function') {\n        return __cv_origCreate(tag, attrs, fixed);\n      } else {\n        const el = document.createElement(tag);\n        if (attrs && typeof attrs === 'object') {\n          for (const [k, v] of Object.entries(attrs)) {\n            if (v == null) continue;\n            if (k in el) el[k] = v; else el.setAttribute(k, String(v));\n          }\n        }\n        fixed.forEach(c => {\n          el.appendChild((typeof c === 'string' || typeof c === 'number') ? document.createTextNode(String(c)) : c);\n        });\n        return el;\n      }\n    };\n  } catch (e) { /* noop */ }\n})();\n`;
      await fs.writeFile(jsMain, content + patch, 'utf8');
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
}

module.exports = { registerWorkspaceHandlers };
