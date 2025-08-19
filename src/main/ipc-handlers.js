/**
 * IPC handlers for the Curator's Vault MVP application.
 * Based on the Electron template but significantly extended for our specific needs.
 */

const { registerIpcHandlers } = require('./ipc-handlers/index.js');

module.exports = { registerIpcHandlers };