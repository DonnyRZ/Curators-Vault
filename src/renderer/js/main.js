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
import { initRouter, navigateToPage } from './router.js';
import { initStepper } from './ui/stepper.js';
import { initializeDashboard } from './dashboard.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Renderer process loaded');
  
  // Initialize all modules
  initializeWorkspaceSetup();
  initializePagesManager();
  initializeFeatureMapping();
  initializeProjectRules();
  initializeGenerateMonitor();
  initializeLivePreview();

  // Router and stepper
  await initRouter('dashboard'); // Make sure router is initialized
  initStepper(navigateToPage);
  initializeDashboard();
});
