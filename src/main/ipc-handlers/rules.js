/**
 * Rules IPC Handlers
 * Handles all rules-related IPC communication
 */

const { ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const Ajv = require('ajv');
const state = require('../state');

// --- Utility Functions (originally from server/utils.js) ---

const rulesSchema = {
  type: "object",
  properties: {
    appType: { type: "string", enum: ["SPA"] },
    language: { type: "string", enum: ["javascript-vanilla", "typescript"] },
    typescript: { type: "boolean" },
    html: { type: "boolean" },
    css: { type: "boolean" },
    constraints: { type: "array", items: { type: "string" } }
  },
  required: ["appType", "language", "typescript", "html", "css", "constraints"],
  additionalProperties: false
};

const ajv = new Ajv();

function validateRules(rules) {
  const validate = ajv.compile(rulesSchema);
  const valid = validate(rules);
  return { valid, errors: valid ? null : validate.errors };
}

/**
 * Register rules-related IPC handlers
 * @param {Electron.BrowserWindow} win – main BrowserWindow
 */
function registerRulesHandlers(win) {
  ipcMain.handle('rules:save', async (event, rulesData) => {
    if (!state.workspacePath) return { success: false, error: 'Workspace not initialized' };
    if (!rulesData) return { success: false, error: 'Rules are required' };

    try {
      const validation = validateRules(rulesData);
      if (!validation.valid) {
        return { success: false, error: 'Invalid rules data', details: validation.errors };
      }
      const rulesPath = path.join(state.workspacePath, 'rules.json');
      await fs.writeFile(rulesPath, JSON.stringify(rulesData, null, 2));
      return { success: true, message: 'Rules saved successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('rules:load', async () => {
    if (!state.workspacePath) return { success: false, error: 'Workspace not initialized' };

    try {
      const rulesPath = path.join(state.workspacePath, 'rules.json');
      const rulesData = await fs.readFile(rulesPath, 'utf8');
      return { success: true, rules: JSON.parse(rulesData) };
    } catch (error) {
      if (error.code === 'ENOENT') {
        const defaultRules = {
          appType: "SPA",
          language: "javascript-vanilla",
          typescript: false,
          html: true,
          css: true,
          constraints: ["single index.html at root", "multiple JS/CSS files allowed", "no frameworks by default"]
        };
        return { success: true, rules: defaultRules };
      }
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerRulesHandlers };
