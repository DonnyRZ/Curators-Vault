// Simple hash-based router for SPA with navigation guards

import { checkProjectStructure, checkProjectRules } from './utils/stateChecker.js';
import { showError } from './ui/toast.js';

const routes = {
  dashboard: 'dashboard-page',
  workspace: 'workspace-setup-page',
  pages: 'pages-manager-page',
  features: 'feature-mapping-page',
  rules: 'project-rules-page',
  generate: 'generate-monitor-page',
  preview: 'live-preview-page',
};

function routeToPageId(route) {
  return routes[route] || routes.dashboard;
}

function pageIdToRoute(id) {
  return Object.entries(routes).find(([, pid]) => pid === id)?.[0] || 'dashboard';
}

/**
 * Checks if navigation to a specific route is allowed based on project state.
 * @param {string} route - The target route.
 * @returns {Promise<{allowed: boolean, message: string}>} - Whether navigation is allowed and a message.
 */
async function canNavigateToRoute(route) {
  const workspacePath = await window.api.getWorkspacePath();
  
  // Always allow navigation to Dashboard and Workspace
  if (route === 'dashboard' || route === 'workspace') {
    return { allowed: true, message: '' };
  }

  // Require a workspace for all other routes
  if (!workspacePath) {
    return { allowed: false, message: 'Please select a workspace first.' };
  }

  // Require pages for Features, Rules, Generate, Preview (but not for Pages itself)
  if (['features', 'rules', 'generate', 'preview'].includes(route)) {
    const pagesResult = await window.api.listPages();
    if (!pagesResult.success || pagesResult.pages.length === 0) {
      return { allowed: false, message: 'Please create at least one page first.' };
    }
  }

  // Require features for Rules, Generate, Preview (but not for Features itself)
  if (['rules', 'generate', 'preview'].includes(route)) {
    const structureCheck = await checkProjectStructure();
    if (!structureCheck.valid) {
      return { allowed: false, message: structureCheck.message };
    }
  }

  // Require rules for Rules, Generate, Preview
  if (['rules', 'generate', 'preview'].includes(route)) {
    const rulesCheck = await checkProjectRules();
    if (!rulesCheck.valid) {
      return { allowed: false, message: rulesCheck.message };
    }
  }

  // If all checks pass
  return { allowed: true, message: '' };
}

export async function navigateToPage(pageId) {
  const route = pageIdToRoute(pageId);
  const guardResult = await canNavigateToRoute(route);
  
  if (!guardResult.allowed) {
    showError(guardResult.message);
    // Optionally, navigate to the last valid page or a default page
    // For now, we'll just show the error and not navigate
    return;
  }

  const pages = document.querySelectorAll('.page');
  pages.forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  document.querySelectorAll('#sidebar .nav-link').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });

  const desiredHash = `#/${route}`;
  if (window.location.hash !== desiredHash) window.location.hash = desiredHash;
}

export async function navigateToRoute(route) {
  const guardResult = await canNavigateToRoute(route);
  
  if (!guardResult.allowed) {
    showError(guardResult.message);
    // Optionally, navigate to the last valid page or a default page
    // For now, we'll just show the error and not navigate
    return;
  }
  
  const pageId = routeToPageId(route);
  navigateToPage(pageId);
}

export function initRouter(defaultRoute = 'dashboard') {
  const applyHashRoute = async () => {
    const hash = window.location.hash || `#/${defaultRoute}`;
    const route = hash.replace(/^#\//, '') || defaultRoute;
    await navigateToRoute(route);
  };
  window.addEventListener('hashchange', applyHashRoute);
  // Initial route application
  applyHashRoute();

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.addEventListener('click', async (e) => {
      const link = e.target.closest('.nav-link');
      if (!link) return;
      e.preventDefault();
      const route = link.dataset.route;
      if (route) await navigateToRoute(route);
    });
  }
}

