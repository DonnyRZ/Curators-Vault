/*
 * Icons initializer: replaces emoji-based labels with unified SVG icons.
 */

function setButtonIcon(btn, iconId, label, { iconOnly = false, ariaLabel } = {}) {
  if (!btn) return;
  btn.innerHTML = '';
  const a11y = ariaLabel || (label || '');
  if (a11y) btn.setAttribute('aria-label', a11y);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${iconId}`);
  svg.appendChild(use);
  btn.appendChild(svg);
  if (!iconOnly && label) {
    const span = document.createElement('span');
    span.className = 'label';
    span.textContent = label;
    btn.appendChild(span);
  }
}

export function initializeIcons() {
  // Left panel
  setButtonIcon(document.getElementById('add-page-btn'), 'i-plus', 'Add New Page');
  setButtonIcon(document.getElementById('bulk-import-btn'), 'i-import', 'Import');
  setButtonIcon(document.getElementById('bulk-export-btn'), 'i-export', 'Export');
  setButtonIcon(document.getElementById('save-features-btn'), 'i-save', 'Save Features');
  setButtonIcon(document.getElementById('use-default-rules-btn'), 'i-rotate', 'Use Defaults');

  // Top bar
  setButtonIcon(document.getElementById('open-folder-btn'), 'i-folder', 'Open Project');
  setButtonIcon(document.getElementById('change-workspace-btn'), 'i-chevron-left', 'Back to Welcome');

  // Right panel (generation)
  setButtonIcon(document.getElementById('plan-btn'), 'i-clipboard', 'Plan');
  setButtonIcon(document.getElementById('build-btn'), 'i-wrench', 'Build');
  setButtonIcon(document.getElementById('plan-build-btn'), 'i-flash', 'Plan + Build');
  setButtonIcon(document.getElementById('stop-generate-btn'), 'i-stop', 'Stop');
  const clearBtn = document.getElementById('clear-output-btn');
  if (clearBtn) {
    // keep as icon-only
    clearBtn.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#i-trash');
    svg.appendChild(use);
    clearBtn.appendChild(svg);
    clearBtn.setAttribute('aria-label', 'Clear Output');
  }

  // Preview toolbar
  setButtonIcon(document.getElementById('preview-back-btn'), 'i-chevron-left', 'Back', { iconOnly: true, ariaLabel: 'Back' });
  setButtonIcon(document.getElementById('preview-forward-btn'), 'i-chevron-right', 'Forward', { iconOnly: true, ariaLabel: 'Forward' });
  setButtonIcon(document.getElementById('preview-reload-btn'), 'i-refresh', 'Reload', { iconOnly: true, ariaLabel: 'Reload' });
  setButtonIcon(document.getElementById('preview-rotate-btn'), 'i-rotate', 'Rotate');
  setButtonIcon(document.getElementById('preview-fit-btn'), 'i-fit', 'Fit');
  setButtonIcon(document.getElementById('preview-devtools-btn'), 'i-code', 'DevTools', { iconOnly: true, ariaLabel: 'DevTools' });
  setButtonIcon(document.getElementById('preview-fix-btn'), 'i-wrench', 'Fix Preview');
  setButtonIcon(document.getElementById('refresh-preview-btn'), 'i-refresh', 'Refresh');
  setButtonIcon(document.getElementById('open-external-btn'), 'i-external', 'Open in Browser');
  setButtonIcon(document.getElementById('export-project-btn'), 'i-export', 'Export Project');

  // Theme toggle: reacts to theme-changed as well
  const themeBtn = document.getElementById('theme-toggle-btn');
  const applyThemeIcon = (theme) => {
    if (!themeBtn) return;
    const label = theme === 'light' ? 'Dark Mode' : 'Light Mode';
    setButtonIcon(themeBtn, theme === 'light' ? 'i-moon' : 'i-sun', label);
  };
  try {
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    applyThemeIcon(theme);
    window.addEventListener('theme-changed', (e) => applyThemeIcon(e.detail?.theme || 'light'));
  } catch (error) {
    console.warn('Failed to initialize theme icons:', error);
  }
}
