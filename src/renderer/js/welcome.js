/*
 * Welcome screen: shows Open Project and Recent Projects
 */

import { navigateToRoute } from './router.js';
import { showError } from './ui/toast.js';

export function initializeWelcome() {
  const recentsContainer = document.getElementById('recent-workspaces');
  const openFromRecent = async (path) => {
    try {
      const res = await window.api.openWorkspace(path);
      if (res && res.success) {
        await navigateToRoute('workspace');
      } else {
        showError(res?.error || 'Unable to open project');
      }
    } catch (e) {
      showError(e.message);
    }
  };

  async function loadRecents() {
    if (!recentsContainer) return;
    try {
      const list = await window.api.getRecentWorkspaces();
      if (!list || list.length === 0) {
        recentsContainer.innerHTML = '<div class="recents-empty">No recent projects</div>';
        return;
      }
      recentsContainer.innerHTML = '';
      list.forEach((p) => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerHTML = `
          <div class="recent-icon">📁</div>
          <div class="recent-info">
            <div class="recent-name">${p.split(/[\\/]/).pop()}</div>
            <div class="recent-path">${p}</div>
          </div>
          <button type="button" class="btn btn-secondary recent-open-btn">Open</button>
        `;
        item.querySelector('.recent-open-btn')?.addEventListener('click', () => openFromRecent(p));
        item.addEventListener('dblclick', () => openFromRecent(p));
        recentsContainer.appendChild(item);
      });
    } catch (e) {
      // no-op
    }
  }

  loadRecents();
}

