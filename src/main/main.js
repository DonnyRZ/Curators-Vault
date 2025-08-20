/**
 * Main process entry point for the Curator's Vault MVP application.
 * Based on the Electron template but customized for our specific needs.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Register all IPC logic
const { registerIpcHandlers } = require('./ipc-handlers/index.js');

let mainWindow;

/* ------------------------------------------------------------------ */
/* Create the main application window                                 */
/* ------------------------------------------------------------------ */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Curator\'s Vault MVP Generator',
    webPreferences: {
      // Security: Enable contextIsolation and disable nodeIntegration
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      // Security: Enable sandbox for the renderer process
      sandbox: true,
    },
  });

  // Load the single HTML page (renderer)
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // Open DevTools automatically in development mode
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Wire up IPC handlers once the window is ready
  registerIpcHandlers(mainWindow);
}

/* ------------------------------------------------------------------ */
/* Electron App Lifecycle                                             */
/* ------------------------------------------------------------------ */
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Quit on all platforms except macOS (common UX pattern)
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  // macOS: recreate a window when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});