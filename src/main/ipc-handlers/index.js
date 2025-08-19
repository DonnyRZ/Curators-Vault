/**
 * Main IPC Handler Registration
 * Coordinates all IPC handlers for the application
 */

const { ipcMain, dialog, app, BrowserWindow } = require('electron');

// Import feature-specific IPC handlers
const { registerWorkspaceHandlers } = require('./workspace.js');
const { registerPageHandlers } = require('./pages.js');
const { registerFeatureHandlers } = require('./features.js');
const { registerRulesHandlers } = require('./rules.js');
const { registerGenerationHandlers } = require('./generation.js');
const { registerWindowHandlers } = require('./window.js');

/**
 * Register all IPC handlers for the application.
 * @param {Electron.BrowserWindow} win – main BrowserWindow
 */
function registerIpcHandlers(win) {
  // Register all feature-specific handlers
  registerWorkspaceHandlers(win);
  registerPageHandlers(win);
  registerFeatureHandlers(win);
  registerRulesHandlers(win);
  registerGenerationHandlers(win);
  registerWindowHandlers(win);
}

module.exports = { registerIpcHandlers };