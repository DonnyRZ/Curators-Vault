/*
 * Main renderer process script for the Curator's Vault MVP application.
 * This script handles UI interactions and communicates with the main process.
 */

import { initializeWorkspaceSetup } from './workspace-setup.js';
import { initializePagesManager } from './pages-manager.js';
import { initializeFeatureMapping } from './feature-mapping/index.js';
import { initializeProjectRules } from './project-rules.js';
import { initializeGenerateMonitor } from './generate-monitor.js';
import { initializeLivePreview } from './live-preview.js';
import { initRouter, navigateToRoute } from './router.js';
import { initializeWelcome } from './welcome.js';
import { initializeWorkspaceLayout } from './workspace-layout.js';
import { initializeTheme } from './theme.js';
import { initializeIcons } from './icons.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Renderer process loaded');
  
  // Initialize modules (safe if DOM elements exist)
  initializeWelcome();
  initializeWorkspaceSetup();
  initializePagesManager();
  initializeFeatureMapping();
  initializeProjectRules();
  initializeGenerateMonitor();
  initializeLivePreview();
  initializeWorkspaceLayout();
  initializeTheme();
  initializeIcons();

  // Router to Welcome/Workspace
  await initRouter('welcome');
  // Try auto-open last project
  try {
    const res = await window.api.autoOpenLastWorkspace();
    if (res && res.success && res.path) {
      await navigateToRoute('workspace');
    }
  } catch (error) {
    console.warn('Failed to auto-open last workspace:', error);
  }
});
