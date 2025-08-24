// Minimal router for 2 routes: welcome and workspace

import { showError } from './ui/toast.js';

const routes = {
  welcome: 'welcome-page',
  workspace: 'workspace-page',
};

function routeToPageId(route) {
  return routes[route] || routes.welcome;
}

function pageIdToRoute(id) {
  return Object.entries(routes).find(([, pid]) => pid === id)?.[0] || 'welcome';
}

async function canNavigateToRoute(route) {
  // Always allow welcome
  if (route === 'welcome') return { allowed: true, message: '' };
  // Workspace requires a selected workspace
  const ws = await window.api.getWorkspacePath();
  if (!ws) return { allowed: false, message: 'Please open a project folder first.' };
  return { allowed: true, message: '' };
}

export async function navigateToPage(pageId) {
  const route = pageIdToRoute(pageId);
  const guardResult = await canNavigateToRoute(route);
  if (!guardResult.allowed) {
    showError(guardResult.message);
    return;
  }
  const pages = document.querySelectorAll('.top-level-page');
  pages.forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');
  const desiredHash = `#/${route}`;
  if (window.location.hash !== desiredHash) window.location.hash = desiredHash;
}

export async function navigateToRoute(route) {
  const guardResult = await canNavigateToRoute(route);
  if (!guardResult.allowed) {
    showError(guardResult.message);
    // fallback: go to welcome
    await navigateToPage('welcome-page');
    return;
  }
  const pageId = routeToPageId(route);
  navigateToPage(pageId);
}

export function initRouter(defaultRoute = 'welcome') {
  const applyHashRoute = async () => {
    const hash = window.location.hash || `#/${defaultRoute}`;
    const route = hash.replace(/^#\//, '') || defaultRoute;
    await navigateToRoute(route);
  };
  window.addEventListener('hashchange', applyHashRoute);
  applyHashRoute();
}

