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

// DOM Elements
const appContainer = document.getElementById('app-container');
const pages = document.querySelectorAll('.page');
const navbar = document.getElementById('navbar');

// Navigation function
export function navigateToPage(pageId) {
  // Hide all pages
  pages.forEach(page => {
    page.classList.remove('active');
  });
  
  // Show the requested page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add('active');
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('Renderer process loaded');
  
  // Initialize all modules
  initializeWorkspaceSetup();
  initializePagesManager();
  initializeFeatureMapping();
  initializeProjectRules();
  initializeGenerateMonitor();
  initializeLivePreview();
});