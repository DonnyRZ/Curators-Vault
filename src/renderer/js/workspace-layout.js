/*
 * Workspace layout behavior: top bar and resizable panels
 */

import { navigateToRoute } from './router.js';
import { showError, showSuccess } from './ui/toast.js';
import { loadPreview } from './live-preview.js';

export function initializeWorkspaceLayout() {
  const grid = document.querySelector('.workspace-grid');
  const title = document.getElementById('workspace-title');
  const changeBtn = document.getElementById('change-workspace-btn');
  const openBtn = document.getElementById('open-folder-btn');
  const statusName = document.getElementById('status-workspace-name');
  const statusQwen = document.getElementById('status-qwen-state');
  const statusBuild = document.getElementById('status-build-time');
  const leftResizer = document.getElementById('left-resizer');
  const rightResizer = document.getElementById('right-resizer');

  async function updateWorkspaceTitle() {
    try {
      const ws = await window.api.getWorkspacePath();
      const name = ws ? ws.split(/[\\/]/).pop() : 'No Project';
      if (title) title.textContent = name;
      if (statusName) statusName.textContent = name;
    } catch {
      // ignore
    }
  }

  async function updateStatusBar() {
    try {
      const ws = await window.api.getWorkspacePath();
      if (ws && statusQwen) {
        const checks = await window.api.checkPreconditions(ws);
        statusQwen.textContent = checks.qwenInstalled ? (checks.promptMode ? 'OK (prompt)' : 'OK') : 'Missing';
      }
      const stats = await window.api.getWorkspaceStats();
      if (statusBuild) {
        statusBuild.textContent = stats.lastBuildAt ? new Date(stats.lastBuildAt).toLocaleString() : '—';
      }
    } catch {
      // ignore
    }
  }

  // Apply persisted panel widths
  const savedLeft = localStorage.getItem('cv.leftWidth');
  const savedRight = localStorage.getItem('cv.rightWidth');
  if (grid) {
    if (savedLeft) grid.style.setProperty('--left-width', `${parseInt(savedLeft, 10)}px`);
    if (savedRight) grid.style.setProperty('--right-width', `${parseInt(savedRight, 10)}px`);
  }

  updateWorkspaceTitle();
  updateStatusBar();

  const workspacePage = document.getElementById('workspace-page');
  if (workspacePage) {
    const ob = new MutationObserver(() => {
      if (workspacePage.classList.contains('active')) { updateWorkspaceTitle(); updateStatusBar(); }
    });
    ob.observe(workspacePage, { attributes: true });
  }

  if (changeBtn) {
    changeBtn.addEventListener('click', async () => {
      // Simple: go back to welcome to choose another project
      await navigateToRoute('welcome');
    });
  }

  // Directly open another project without leaving the workspace
  if (openBtn) {
    openBtn.addEventListener('click', async () => {
      try {
        const path = await window.api.selectWorkspace();
        if (!path) return;
        // Run prechecks and initialize
        const checks = await window.api.checkPreconditions(path);
        if (!checks.qwenInstalled || !checks.promptMode || !checks.writePermissions) {
          showError('Preconditions not met. Please ensure Qwen Code, prompt mode support, and write permissions.');
          return;
        }
        const initResult = await window.api.createWorkspace(path);
        if (!initResult.success) {
          showError(initResult.error || 'Failed to initialize workspace');
          return;
        }
        showSuccess('Workspace opened');
        await updateWorkspaceTitle();
        await navigateToRoute('workspace');
        await loadPreview();
        await updateStatusBar();
      } catch (e) {
        showError(e.message);
      }
    });
  }

  function setupResizer(resizer, side) {
    if (!grid || !resizer) return;
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    let startRight = 0;

    const minLeft = 220;
    const maxLeft = 600;
    const minRight = 280;
    const maxRight = 640;

    const onPointerMove = (e) => {
      if (!dragging) return;
      const rect = grid.getBoundingClientRect();
      const dx = e.clientX - startX;
      if (side === 'left') {
        let newLeft = startLeft + dx;
        newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
        grid.style.setProperty('--left-width', `${newLeft}px`);
      } else {
        // right resizer moves from the right edge; we compute new right width as container width - x
        let x = e.clientX - rect.left;
        let newRight = rect.width - x;
        newRight = Math.max(minRight, Math.min(maxRight, newRight));
        grid.style.setProperty('--right-width', `${newRight}px`);
      }
    };

    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      resizer.classList.remove('dragging');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      // Persist widths
      const leftWidth = parseInt(getComputedStyle(grid).getPropertyValue('--left-width')) || 320;
      const rightWidth = parseInt(getComputedStyle(grid).getPropertyValue('--right-width')) || 420;
      localStorage.setItem('cv.leftWidth', String(leftWidth));
      localStorage.setItem('cv.rightWidth', String(rightWidth));
    };

    resizer.addEventListener('pointerdown', (e) => {
      dragging = true;
      resizer.classList.add('dragging');
      const rect = grid.getBoundingClientRect();
      startX = e.clientX;
      const leftWidth = parseInt(getComputedStyle(grid).getPropertyValue('--left-width')) || 320;
      const rightWidth = parseInt(getComputedStyle(grid).getPropertyValue('--right-width')) || 420;
      startLeft = leftWidth;
      startRight = rightWidth;
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      e.preventDefault();
    });
  }

  setupResizer(leftResizer, 'left');
  setupResizer(rightResizer, 'right');
}
