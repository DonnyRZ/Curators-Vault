/*
 * Live Preview Module
 * Handles the live preview of the generated MVP
 */

let previewFrame = null;
let previewFrameWrap = null;
let refreshPreviewBtn = null;
let openExternalBtn = null;
let rebuildBtn = null;
let exportProjectBtn = null;
let previewBackBtn = null;
let previewForwardBtn = null;
let previewReloadBtn = null;
let previewDevtoolsBtn = null;
let previewUrlInput = null;
let previewDeviceSelect = null;
let refreshDebounceTimer = null;
let previewRotateBtn = null;
let previewFitBtn = null;
let isRotated = false;
let fitToWidth = false;
let placeholderEl = null;
let previewFixBtn = null;

// Function to load the preview
import { showInfo, showError, showSuccess } from './ui/toast.js';

export async function loadPreview(targetFrame) {
  const frame = targetFrame || previewFrame;
  if (frame) {
    try {
      // Get the workspace path from the main process
      const workspacePath = await window.api.getWorkspacePath();
      
      if (workspacePath) {
        // Check if an index.html exists via workspace stats
        const stats = await window.api.getWorkspaceStats();
        const hasIndex = Boolean(stats && stats.lastBuildAt);
        if (!hasIndex) {
          // Show placeholder
          if (placeholderEl) placeholderEl.classList.remove('hidden');
          frame.src = 'about:blank';
          if (previewUrlInput) previewUrlInput.value = '';
          return;
        } else {
          if (placeholderEl) placeholderEl.classList.add('hidden');
        }
        // Construct the file URL for the index.html file
        // On Windows, we need to use file:// with forward slashes
        const normalizedPath = workspacePath.replace(/\\/g, '/');
        const indexPath = `file:///${normalizedPath}/index.html`;
        frame.src = indexPath;
        
        // Update URL input
        if (previewUrlInput) {
          previewUrlInput.value = indexPath;
        }
        
        // Update navigation buttons
        if (previewBackBtn) previewBackBtn.disabled = !frame.contentWindow?.history?.length;
        if (previewForwardBtn) previewForwardBtn.disabled = !frame.contentWindow?.history?.length;
      } else {
        frame.src = 'about:blank';
        if (previewUrlInput) {
          previewUrlInput.value = '';
        }
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      frame.src = 'about:blank';
      if (previewUrlInput) {
        previewUrlInput.value = '';
      }
    }
  }
}

// Function to refresh the preview
export function refreshPreview(targetFrame) {
  const frame = targetFrame || previewFrame;
  if (frame) {
    // Debounce rapid refreshes
    if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
    refreshDebounceTimer = setTimeout(() => {
      const currentSrc = frame.src;
      frame.src = '';
      setTimeout(() => {
        frame.src = currentSrc;
      }, 10);
    }, 200);
  }
}

// Function to go back in preview history
function goBack() {
  if (previewFrame && previewFrame.contentWindow) {
    previewFrame.contentWindow.history.back();
  }
}

// Function to go forward in preview history
function goForward() {
  if (previewFrame && previewFrame.contentWindow) {
    previewFrame.contentWindow.history.forward();
  }
}

// Function to open devtools
function openDevtools() {
  // In a real implementation, this would open devtools
  showInfo('DevTools would open here in a full implementation');
}

export function initializeLivePreview() {
  // Live Preview Page Elements
  refreshPreviewBtn = document.getElementById('refresh-preview-btn');
  openExternalBtn = document.getElementById('open-external-btn');
  rebuildBtn = document.getElementById('rebuild-btn');
  exportProjectBtn = document.getElementById('export-project-btn');
  previewFrame = document.getElementById('preview-frame');
  previewFrameWrap = document.getElementById('preview-frame-wrap');
  previewBackBtn = document.getElementById('preview-back-btn');
  previewForwardBtn = document.getElementById('preview-forward-btn');
  previewReloadBtn = document.getElementById('preview-reload-btn');
  previewDevtoolsBtn = document.getElementById('preview-devtools-btn');
  previewUrlInput = document.getElementById('preview-url');
  previewDeviceSelect = document.getElementById('preview-device');
  previewRotateBtn = document.getElementById('preview-rotate-btn');
  previewFitBtn = document.getElementById('preview-fit-btn');
  placeholderEl = document.getElementById('preview-placeholder');
  previewFixBtn = document.getElementById('preview-fix-btn');
  
  // In the new workspace layout, load preview whenever the workspace is shown
  const workspacePage = document.getElementById('workspace-page');
  if (workspacePage) {
    const wsObserver = new MutationObserver(() => {
      if (workspacePage.classList.contains('active')) {
        loadPreview();
      }
    });
    wsObserver.observe(workspacePage, { attributes: true });
  }

  // Also attempt to load once if frame exists
  if (previewFrame) {
    loadPreview();
  }

  // Refresh preview when the main process asks us to
  if (window.api && typeof window.api.onPreviewReload === 'function') {
    window.api.onPreviewReload(() => {
      refreshPreview();
    });
  }
  
  if (refreshPreviewBtn) {
    refreshPreviewBtn.addEventListener('click', () => {
      refreshPreview();
      showSuccess('Preview refreshed');
    });
  }
  
  if (openExternalBtn) {
    openExternalBtn.addEventListener('click', async () => {
      if (previewFrame && previewFrame.src && previewFrame.src !== 'about:blank') {
        await window.api.openExternal(previewFrame.src);
      } else {
        // Try to load the preview first
        await loadPreview();
        if (previewFrame && previewFrame.src && previewFrame.src !== 'about:blank') {
          await window.api.openExternal(previewFrame.src);
        } else {
          showError('No preview available to open in external browser.');
        }
      }
    });
  }
  
  if (rebuildBtn) {
    rebuildBtn.addEventListener('click', () => {
      // In a full implementation, this would trigger a rebuild
      showInfo('Rebuilding... (not implemented in this example)');
    });
  }
  
  if (exportProjectBtn) {
    exportProjectBtn.addEventListener('click', () => {
      // In a full implementation, this would export the project
      showInfo('Exporting project... (not implemented in this example)');
    });
  }
  
  // New toolbar buttons
  if (previewBackBtn) {
    previewBackBtn.addEventListener('click', () => {
      goBack();
      showSuccess('Navigated back');
    });
  }
  
  if (previewForwardBtn) {
    previewForwardBtn.addEventListener('click', () => {
      goForward();
      showSuccess('Navigated forward');
    });
  }
  
  if (previewReloadBtn) {
    previewReloadBtn.addEventListener('click', () => {
      refreshPreview();
      showSuccess('Preview reloaded');
    });
  }
  
  if (previewDevtoolsBtn) {
    previewDevtoolsBtn.addEventListener('click', () => {
      openDevtools();
    });
  }
  
  // URL input (readonly)
  if (previewUrlInput) {
    previewUrlInput.addEventListener('click', () => {
      previewUrlInput.select();
      document.execCommand('copy');
      showSuccess('URL copied to clipboard');
    });
  }

  // Device selector
  if (previewDeviceSelect && previewFrameWrap) {
    const getSimDims = () => {
      const val = previewDeviceSelect.value;
      let w = 0, h = 0;
      if (val === 'mobile') { w = 375; h = 667; }
      else if (val === 'tablet') { w = 768; h = 1024; }
      else if (val === 'desktop') { w = 1280; h = 800; }
      return { w, h };
    };

    const applyFitScale = (w, h) => {
      if (!fitToWidth || !previewFrame || !previewFrameWrap) return;
      // Compute scale to fit width
      const wrapWidth = previewFrameWrap.clientWidth - 24; // padding allowance
      if (w <= 0) return;
      const scale = Math.min(1, wrapWidth / w);
      previewFrame.style.transform = `scale(${scale})`;
      previewFrame.style.transformOrigin = 'top center';
      previewFrame.style.width = `${w}px`;
      previewFrame.style.height = `${h}px`;
      previewFrameWrap.classList.add('simulated');
      previewFrameWrap.style.setProperty('--sim-w', `${w}px`);
      previewFrameWrap.style.setProperty('--sim-h', `${h}px`);
    };

    const clearFitScale = () => {
      if (!previewFrame) return;
      previewFrame.style.transform = '';
      previewFrame.style.transformOrigin = '';
      previewFrame.style.width = '';
      previewFrame.style.height = '';
    };

    const applyDevice = () => {
      const val = previewDeviceSelect.value;
      localStorage.setItem('cv.preview.device', val);
      let { w, h } = getSimDims();
      if (isRotated && w && h) [w, h] = [h, w];
      if (val === 'responsive') {
        previewFrameWrap.classList.remove('simulated');
        previewFrameWrap.style.removeProperty('--sim-w');
        previewFrameWrap.style.removeProperty('--sim-h');
        clearFitScale();
      } else {
        previewFrameWrap.classList.add('simulated');
        previewFrameWrap.style.setProperty('--sim-w', `${w}px`);
        previewFrameWrap.style.setProperty('--sim-h', `${h}px`);
        if (fitToWidth) applyFitScale(w, h); else clearFitScale();
      }
    };
    previewDeviceSelect.addEventListener('change', applyDevice);

    // Rotation
    if (previewRotateBtn) {
      previewRotateBtn.addEventListener('click', () => {
        isRotated = !isRotated;
        localStorage.setItem('cv.preview.rotated', isRotated ? '1' : '0');
        applyDevice();
      });
    }

    // Fit to width
    if (previewFitBtn) {
      previewFitBtn.addEventListener('click', () => {
        fitToWidth = !fitToWidth;
        localStorage.setItem('cv.preview.fit', fitToWidth ? '1' : '0');
        previewFitBtn.classList.toggle('active', fitToWidth);
        applyDevice();
      });
    }

    // Persisted state
    const savedDevice = localStorage.getItem('cv.preview.device');
    const savedRot = localStorage.getItem('cv.preview.rotated') === '1';
    const savedFit = localStorage.getItem('cv.preview.fit') === '1';
    if (savedDevice && previewDeviceSelect.querySelector(`option[value="${savedDevice}"]`)) {
      previewDeviceSelect.value = savedDevice;
    }
    isRotated = savedRot;
    fitToWidth = savedFit;
    if (previewFitBtn) previewFitBtn.classList.toggle('active', fitToWidth);
    applyDevice();

    // Re-apply scale on resize if fitting
    window.addEventListener('resize', () => {
      if (!fitToWidth) return;
      const val = previewDeviceSelect.value;
      let { w, h } = getSimDims();
      if (isRotated && w && h) [w, h] = [h, w];
      applyFitScale(w, h);
    });
  }

  // Run Plan+Build from placeholder CTA
  const runPlanBuildBtn = document.getElementById('run-plan-build-btn');
  if (runPlanBuildBtn) {
    runPlanBuildBtn.addEventListener('click', () => {
      document.getElementById('plan-build-btn')?.click();
    });
  }

  // Fix preview button (attempts to patch generated main.js)
  if (previewFixBtn) {
    previewFixBtn.addEventListener('click', async () => {
      try {
        const res = await window.api.applyPreviewFix();
        if (!res || !res.success) {
          showError(res?.error || 'Unable to apply preview fix');
        } else {
          showSuccess('Preview fix applied');
          await loadPreview();
          refreshPreview();
        }
      } catch (e) {
        showError(e.message);
      }
    });
  }
}
