import { showInfo } from './ui/toast.js';

export function initializeDashboard() {
  const statsEl = document.getElementById('dashboard-stats');
  const goPagesBtn = document.getElementById('dash-go-pages');
  const goGenerateBtn = document.getElementById('dash-go-generate');

  async function refresh() {
    try {
      const stats = await window.api.getWorkspaceStats();
      if (statsEl) {
        const lp = stats.lastPlanAt ? new Date(stats.lastPlanAt).toLocaleString() : '—';
        const lb = stats.lastBuildAt ? new Date(stats.lastBuildAt).toLocaleString() : '—';
        statsEl.innerHTML = `
          <div class="stat-card">
            <div class="stat-value">${stats.pages}</div>
            <div class="stat-label">Pages</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.features}</div>
            <div class="stat-label">Features</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${lp}</div>
            <div class="stat-label">Last Plan</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${lb}</div>
            <div class="stat-label">Last Build</div>
          </div>
        `;
      }
    } catch (e) {
      // no-op
    }
  }

  if (goPagesBtn) {
    goPagesBtn.addEventListener('click', () => {
      window.location.hash = '#/pages';
    });
  }
  
  if (goGenerateBtn) {
    goGenerateBtn.addEventListener('click', () => {
      window.location.hash = '#/generate';
    });
  }

  // Add event listeners to the quick action cards
  const quickActionCards = document.querySelectorAll('.quick-action-card');
  quickActionCards.forEach(card => {
    card.addEventListener('click', (e) => {
      const id = e.currentTarget.id;
      if (id === 'dash-go-pages') {
        window.location.hash = '#/pages';
      } else if (id === 'dash-go-generate') {
        window.location.hash = '#/generate';
      }
    });
  });

  refresh();
}