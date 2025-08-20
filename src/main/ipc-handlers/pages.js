/**
 * Pages IPC Handlers
 * Handles all page-related IPC communication
 */

const { ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const state = require('../state');

// --- Utility Functions ---

async function getNextPageId(workspacePath) {
  try {
    const entries = await fs.readdir(workspacePath, { withFileTypes: true });
    const pageDirs = entries
      .filter(entry => entry.isDirectory() && /^page-\d+$/.test(entry.name))
      .map(entry => {
        const num = parseInt(entry.name.split('-')[1], 10);
        return isNaN(num) ? 0 : num;
      })
      .sort((a, b) => a - b);
    if (pageDirs.length === 0) return 'page-1';
    const lastId = pageDirs[pageDirs.length - 1];
    return `page-${lastId + 1}`;
  } catch (err) {
    return 'page-1';
  }
}

/**
 * Register page-related IPC handlers
 * @param {Electron.BrowserWindow} win – main BrowserWindow
 */
function registerPageHandlers(win) {
  ipcMain.handle('pages:create', async (event, pageId, pageName) => {
    if (!state.workspacePath) {
      return { success: false, error: 'Workspace not initialized' };
    }
    if (!pageId || !pageName) {
      return { success: false, error: 'Page ID and name are required' };
    }
    try {
      const pageDir = path.join(state.workspacePath, pageId);
      await fs.mkdir(pageDir, { recursive: true });
      
      // Create an empty features.json file
      const featuresPath = path.join(pageDir, 'features.json');
      await fs.writeFile(featuresPath, JSON.stringify([], null, 2));
      // Create/update page.json metadata
      const metaPath = path.join(pageDir, 'page.json');
      const meta = { id: pageId, name: pageName };
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      
      return { success: true, message: `Created page ${pageId}` };
    } catch (error) {
      console.error(`[IPC] Error creating page ${pageId}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pages:list', async () => {
    if (!state.workspacePath) {
      return { success: false, error: 'Workspace not initialized' };
    }
    try {
      const pages = [];
      const entries = await fs.readdir(state.workspacePath, { withFileTypes: true });
      const pageDirs = entries.filter(entry => entry.isDirectory() && /^page-\d+$/.test(entry.name));
      
      for (const dir of pageDirs) {
        const pageId = dir.name;
        const pageDirPath = path.join(state.workspacePath, pageId);
        
        try {
          const featuresPath = path.join(pageDirPath, 'features.json');
          let hasFeatures = false;
          try {
            const featuresData = await fs.readFile(featuresPath, 'utf8');
            const features = JSON.parse(featuresData);
            hasFeatures = Array.isArray(features) && features.length > 0;
          } catch (err) { /* features.json doesn't exist or is invalid */ }
          
          // Read page name from page.json if available
          let pageName = pageId.replace('page-', 'Page ');
          try {
            const metaPath = path.join(pageDirPath, 'page.json');
            const metaData = await fs.readFile(metaPath, 'utf8');
            const meta = JSON.parse(metaData);
            if (meta && meta.name) pageName = meta.name;
          } catch (err) { /* ignore */ }
          
          pages.push({ 
            id: pageId, 
            name: pageName, 
            path: pageDirPath, 
            hasFeatures 
          });
        } catch (err) {
          pages.push({ 
            id: pageId, 
            name: pageId.replace('page-', 'Page '), 
            path: pageDirPath, 
            hasFeatures: false 
          });
        }
      }
      
      // Sort pages by ID number
      pages.sort((a, b) => {
        const numA = parseInt(a.id.split('-')[1], 10);
        const numB = parseInt(b.id.split('-')[1], 10);
        return numA - numB;
      });
      
      return { success: true, pages };
    } catch (error) {
      console.error('[IPC] Error listing pages:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('page:delete', async (event, id) => {
    if (!state.workspacePath) {
      return { success: false, error: 'Workspace not initialized' };
    }
    try {
      const pageDir = path.join(state.workspacePath, id);
      await fs.rm(pageDir, { recursive: true, force: true });
      return { success: true, message: `Deleted page ${id}` };
    } catch (error) {
      console.error(`[IPC] Error deleting page ${id}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Update page name metadata
  ipcMain.handle('page:update-name', async (event, id, name) => {
    if (!state.workspacePath) {
      return { success: false, error: 'Workspace not initialized' };
    }
    if (!id || !name) {
      return { success: false, error: 'Page id and name are required' };
    }
    try {
      const pageDir = path.join(state.workspacePath, id);
      const metaPath = path.join(pageDir, 'page.json');
      const meta = { id, name };
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));
      return { success: true };
    } catch (error) {
      console.error(`[IPC] Error updating page name for ${id}:`, error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerPageHandlers };
