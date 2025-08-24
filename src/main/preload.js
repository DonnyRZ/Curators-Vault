/**
 * Preload script for the Curator's Vault MVP application.
 * Based on the Electron template but customized for our specific needs.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // --- Workspace Setup ---
  selectWorkspace: () => ipcRenderer.invoke('workspace:select'),
  createWorkspace: (path) => ipcRenderer.invoke('workspace:create', path),
  checkPreconditions: (path) => ipcRenderer.invoke('workspace:check-preconditions', path),
  getWorkspacePath: () => ipcRenderer.invoke('workspace:get-path'),
  getRecentWorkspaces: () => ipcRenderer.invoke('workspace:get-recents'),
  openWorkspace: (path) => ipcRenderer.invoke('workspace:open', path),
  getWorkspaceStats: () => ipcRenderer.invoke('workspace:stats'),
  autoOpenLastWorkspace: () => ipcRenderer.invoke('workspace:auto-open-last'),
  applyPreviewFix: () => ipcRenderer.invoke('workspace:apply-preview-fix'),
  
  // --- Pages Manager ---
  createPage: (pageId, pageName) => ipcRenderer.invoke('pages:create', pageId, pageName),
  listPages: () => ipcRenderer.invoke('pages:list'),
  deletePage: (id) => ipcRenderer.invoke('page:delete', id),
  updatePageName: (id, name) => ipcRenderer.invoke('page:update-name', id, name),
  
  // --- Feature Mapping ---
  saveFeatures: (pageId, featuresData) => ipcRenderer.invoke('features:save', pageId, featuresData),
  loadFeatures: (pageId) => ipcRenderer.invoke('features:load', pageId),
  bulkImportFeatures: (data) => ipcRenderer.invoke('features:bulk-import', data),
  bulkExportFeatures: () => ipcRenderer.invoke('features:bulk-export'),
  
  // --- Project Rules ---
  saveRules: (rulesData) => ipcRenderer.invoke('rules:save', rulesData),
  loadRules: () => ipcRenderer.invoke('rules:load'),
  
  // --- Generate & Monitor ---
  startGeneration: () => ipcRenderer.invoke('generate:start'),
  planGeneration: () => ipcRenderer.invoke('generate:plan'),
  buildGeneration: () => ipcRenderer.invoke('generate:build'),
  stopGeneration: () => ipcRenderer.invoke('generate:stop'),
  retryStage: (stage) => ipcRenderer.invoke('generate:retry', stage),
  onGenerationOutput: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('generate:output', (_, data) => callback(data));
  },
  onGenerationError: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('generate:error', (_, error) => callback(error));
  },
  onGenerationComplete: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.once('generate:complete', (_, result) => callback(result));
  },
  
  // --- Live Preview ---
  onPreviewReload: (callback) => {
    if (typeof callback !== 'function') return;
    ipcRenderer.on('preview:reload', () => callback());
  },
  
  // --- General ---
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
});
