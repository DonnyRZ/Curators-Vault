/**
 * Window IPC Handlers
 * Handles all window-related IPC communication
 */

const { ipcMain } = require('electron');

/**
 * Register window-related IPC handlers
 * @param {Electron.BrowserWindow} win – main BrowserWindow
 */
function registerWindowHandlers(win) {
  // --- General ---
  ipcMain.handle('window:minimize', () => {
    win.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    win.close();
  });
}

module.exports = { registerWindowHandlers };