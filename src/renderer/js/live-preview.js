/*
 * Live Preview Module
 * Handles the live preview of the generated MVP
 */

let previewFrame = null;
let refreshPreviewBtn = null;
let openExternalBtn = null;
let rebuildBtn = null;
let exportProjectBtn = null;
let previewBackBtn = null;
let previewForwardBtn = null;
let previewReloadBtn = null;
let previewDevtoolsBtn = null;
let previewUrlInput = null;

// Function to load the preview
import { showInfo, showError, showSuccess } from './ui/toast.js';

export async function loadPreview(targetFrame) {
  const frame = targetFrame || previewFrame;
  if (frame) {
    try {
      // Get the workspace path from the main process
      const workspacePath = await window.api.getWorkspacePath();
      
      if (workspacePath) {
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
    // Force reload by changing the src
    const currentSrc = frame.src;
    frame.src = '';
    setTimeout(() => {
      frame.src = currentSrc;
    }, 10);
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
  previewBackBtn = document.getElementById('preview-back-btn');
  previewForwardBtn = document.getElementById('preview-forward-btn');
  previewReloadBtn = document.getElementById('preview-reload-btn');
  previewDevtoolsBtn = document.getElementById('preview-devtools-btn');
  previewUrlInput = document.getElementById('preview-url');
  
  // Set up event listeners for when the Live Preview page becomes active
  const livePreviewPage = document.getElementById('live-preview-page');
  if (livePreviewPage) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          if (livePreviewPage.classList.contains('active')) {
            // Page became active, load the preview
            loadPreview();
          }
        }
      });
    });
    
    observer.observe(livePreviewPage, { attributes: true });
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
        // In a real implementation, this would open in external browser
        showInfo(`In a full implementation, this would open: ${previewFrame.src}`);
      } else {
        // Try to load the preview first
        await loadPreview();
        if (previewFrame && previewFrame.src && previewFrame.src !== 'about:blank') {
          showInfo(`In a full implementation, this would open: ${previewFrame.src}`);
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
}