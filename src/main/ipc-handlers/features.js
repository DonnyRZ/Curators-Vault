/**
 * Feature IPC Handlers
 * Handles all feature-related IPC communication
 */

const { ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const Ajv = require('ajv');
const state = require('../state');

// --- Utility Functions ---

const featuresSchema = {
  type: "object",
  properties: {
    pageId: { type: "string" },
    features: {
      type: "array",
      items: {
        type: "object",
        properties: { 
          id: { type: "string" }, 
          name: { type: "string" }, 
          description: { type: "string" },
          implementationDetails: {
            type: "object",
            properties: {
              uiComponents: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    id: { type: "string" },
                    className: { type: "string" },
                    purpose: { type: "string" }
                  },
                  required: ["type", "purpose"]
                }
              },
              interactions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    elementId: { type: "string" },
                    eventType: { type: "string" },
                    handlerFunction: { type: "string" },
                    description: { type: "string" }
                  },
                  required: ["elementId", "eventType", "handlerFunction"]
                }
              },
              dataHandling: {
                type: "object",
                properties: {
                  storage: { type: "string" },
                  retrieval: { type: "string" },
                  manipulation: { type: "string" }
                }
              },
              stateManagement: {
                type: "object",
                properties: {
                  stateVariables: {
                    type: "array",
                    items: { type: "string" }
                  },
                  updateFunctions: {
                    type: "array",
                    items: { type: "string" }
                  }
                }
              }
            }
          }
        },
        required: ["id", "name", "description"]
      }
    }
  },
  required: ["pageId", "features"],
  additionalProperties: false
};

const ajv = new Ajv();

function validateFeatures(features) {
  const validate = ajv.compile(featuresSchema);
  const valid = validate(features);
  return { valid, errors: valid ? null : validate.errors };
}

// Helper function to convert mockup IDs to page IDs if needed
function convertToPageId(id) {
  // If it's already a page ID, return as is
  if (id.startsWith('page-')) {
    return id;
  }
  // If it's a mockup ID (numeric), convert to page ID
  if (/^\d{3}$/.test(id)) {
    return `page-${parseInt(id, 10)}`;
  }
  // If it's something else, just return it
  return id;
}

/**
 * Register feature-related IPC handlers
 * @param {Electron.BrowserWindow} win – main BrowserWindow
 */
function registerFeatureHandlers(win) {
  ipcMain.handle('features:save', async (event, pageId, featuresData) => {
    if (!state.workspacePath) return { success: false, error: 'Workspace not initialized' };
    if (!pageId || !featuresData) return { success: false, error: 'Page ID and features are required' };

    try {
      // Convert pageId if it's in mockup format
      const convertedPageId = convertToPageId(pageId);
      
      const validation = validateFeatures({ pageId: convertedPageId, features: featuresData });
      if (!validation.valid) {
        return { success: false, error: 'Invalid features data', details: validation.errors };
      }
      
      // Ensure the page directory exists
      const pageDir = path.join(state.workspacePath, convertedPageId);
      await fs.mkdir(pageDir, { recursive: true });
      
      const featuresPath = path.join(pageDir, 'features.json');
      await fs.writeFile(featuresPath, JSON.stringify(featuresData, null, 2));
      return { success: true, message: 'Features saved successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('features:load', async (event, pageId) => {
    if (!state.workspacePath) return { success: false, error: 'Workspace not initialized' };
    if (!pageId) return { success: false, error: 'Page ID is required' };

    try {
      // Convert pageId if it's in mockup format
      const convertedPageId = convertToPageId(pageId);
      
      const featuresPath = path.join(state.workspacePath, convertedPageId, 'features.json');
      const featuresData = await fs.readFile(featuresPath, 'utf8');
      return { success: true, features: JSON.parse(featuresData) };
    } catch (error) {
      if (error.code === 'ENOENT') return { success: true, features: [] };
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('features:bulk-import', async (event, data) => {
    if (!state.workspacePath) return { success: false, error: 'Workspace not initialized' };
    if (!data || typeof data !== 'object') return { success: false, error: 'Valid features data is required' };

    try {
      // Process each entry in the data
      for (const originalId in data) {
        // Convert the ID from mockup format to page format if needed
        const pageId = convertToPageId(originalId);
        const pageFeatures = data[originalId];
        
        const validation = validateFeatures({ pageId, features: pageFeatures });
        if (!validation.valid) {
          return { success: false, error: `Invalid features data for page ${pageId}`, details: validation.errors };
        }
        
        // Ensure the page directory exists before saving features
        const pageDir = path.join(state.workspacePath, pageId);
        await fs.mkdir(pageDir, { recursive: true });
        
        const featuresPath = path.join(pageDir, 'features.json');
        await fs.writeFile(featuresPath, JSON.stringify(pageFeatures, null, 2));
      }
      return { success: true, message: 'Features imported successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('features:bulk-export', async () => {
    if (!state.workspacePath) return { success: false, error: 'Workspace not initialized' };

    try {
      const allFeatures = {};
      const entries = await fs.readdir(state.workspacePath, { withFileTypes: true });
      const pageDirs = entries.filter(entry => entry.isDirectory() && /^page-\d+$/.test(entry.name));

      for (const dir of pageDirs) {
        const featuresPath = path.join(state.workspacePath, dir.name, 'features.json');
        try {
          const featuresData = await fs.readFile(featuresPath, 'utf8');
          allFeatures[dir.name] = JSON.parse(featuresData);
        } catch (err) {
          if (err.code !== 'ENOENT') throw err;
        }
      }
      return { success: true, data: allFeatures };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerFeatureHandlers };