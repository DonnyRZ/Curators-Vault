/*
 * Live Preview Module
 * Handles the live preview of the generated MVP
 */

let previewFrame = null;
let refreshPreviewBtn = null;
let openExternalBtn = null;
let rebuildBtn = null;
let exportProjectBtn = null;

// Function to load the preview
async function loadPreview() {
  if (previewFrame) {
    try {
      // Get the workspace path from the main process
      const workspacePath = await window.api.getWorkspacePath();
      
      if (workspacePath) {
        // Construct the file URL for the index.html file
        // On Windows, we need to use file:// with forward slashes
        const normalizedPath = workspacePath.replace(/\\/g, '/');
        const indexPath = `file:///${normalizedPath}/index.html`;
        previewFrame.src = indexPath;
      } else {
        previewFrame.src = 'about:blank';
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      previewFrame.src = 'about:blank';
    }
  }
}

// Function to refresh the preview
function refreshPreview() {
  if (previewFrame) {
    // Force reload by changing the src
    previewFrame.src = previewFrame.src;
  }
}

export function initializeLivePreview() {
  // Live Preview Page Elements
  refreshPreviewBtn = document.getElementById('refresh-preview-btn');
  openExternalBtn = document.getElementById('open-external-btn');
  rebuildBtn = document.getElementById('rebuild-btn');
  exportProjectBtn = document.getElementById('export-project-btn');
  previewFrame = document.getElementById('preview-frame');
  
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
    });
  }
  
  if (openExternalBtn) {
    openExternalBtn.addEventListener('click', async () => {
      if (previewFrame && previewFrame.src && previewFrame.src !== 'about:blank') {
        // In a full implementation, this would open the preview in an external browser
        // For now, we'll just alert the URL
        alert(`To open in external browser, navigate to: ${previewFrame.src}`);
      } else {
        // Try to load the preview first
        await loadPreview();
        if (previewFrame && previewFrame.src && previewFrame.src !== 'about:blank') {
          alert(`To open in external browser, navigate to: ${previewFrame.src}`);
        } else {
          alert('No preview available to open in external browser.');
        }
      }
    });
  }
  
  if (rebuildBtn) {
    rebuildBtn.addEventListener('click', () => {
      // In a full implementation, this would trigger a rebuild
      alert('Rebuilding... (not implemented in this example)');
    });
  }
  
  if (exportProjectBtn) {
    exportProjectBtn.addEventListener('click', () => {
      // In a full implementation, this would export the project
      alert('Exporting project... (not implemented in this example)');
    });
  }
}